/**
 * ONLI Model Context Protocol service
 *
 * This module exports a set of functions that help recommend a build configuration,
 * plan a movement flow and generate Cloud API request bodies.  It is intended
 * as a starting point for appliance developers or agents integrating with
 * the Onli Cloud v3 API.  The logic implemented here is minimal and
 * deterministic, following the guidance from the Onli MCP specification.
 */

/**
 * Determine the appropriate build configuration based on the input flags.
 *
 * @param {Object} input - The use case description with flags indicating
 *                         whether denominations or series are needed.
 * @returns {string} One of "Denomination", "Symmetric" or "Series".
 */
function chooseConfig(input) {
  if (input && input.needs_denominations) {
    return 'Denomination';
  }
  if (input && input.needs_series) {
    return 'Series';
  }
  // Default to symmetric when no special flags are present
  return 'Symmetric';
}

/**
 * Recommend a build configuration for the given use case.
 *
 * @param {Object} input - An object describing the use case.  Recognised
 *                         properties include needs_denominations (boolean),
 *                         needs_series (boolean) and unit_is_unique (boolean).
 * @returns {Object} A BuildRecommendation object outlining the chosen
 *                   configuration and rationale.
 */
function recommend_configuration(input) {
  const configuration = chooseConfig(input);
  let amountCountRelation;
  let interchangeability;

  switch (configuration) {
    case 'Denomination':
      amountCountRelation = 'x:1';
      interchangeability = 'Units with the same face are interchangeable';
      break;
    case 'Series':
      amountCountRelation = '1:1-stamped';
      interchangeability = 'Exchangeable only within the same series';
      break;
    case 'Symmetric':
    default:
      amountCountRelation = '1:1';
      interchangeability = 'Each unit is distinct';
  }

  return {
    configuration,
    amountCountRelation,
    interchangeability,
    appliance_responsibility: [],
    cloud_api_guarantees: ['amount integrity', 'owner-auth movement'],
    rationale: `Selected ${configuration} based on input flags`,
    typical_examples: []
  };
}

/**
 * Plan a flow for moving assets based on the pattern and configuration.  This
 * function produces an array of step objects that describe the high level
 * sequence of operations.  It does not fill in all fields for the API
 * requests; those are supplied later when generating requests.
 *
 * @param {Object} params
 *   @param {string} params.entry - "treasury", "owner-vault" or "appliance".
 *   @param {string} params.pattern - "self-vault", "owner-to-owner" or "appliance-conditional".
 *   @param {Object|null} params.condition - Condition object or null when none.
 *   @param {string} params.config - The configuration name (e.g., "Denomination").
 *   @param {number} params.amount - The total amount of assets to move.
 *   @param {Object} params.parties - Information about the actors involved.
 *     @param {string} params.parties.from_owner - Onli ID of the current owner.
 *     @param {string} [params.parties.to_owner] - Onli ID of the recipient (for owner-to-owner transfers).
 *     @param {string[]} [params.parties.buyers] - For multi-recipient transfers.
 * @returns {Object} A FlowPlan object containing an array of steps and the condition.
 */
function plan_flow({ entry, pattern, condition, config, amount, parties }) {
  const steps = [];

  // Step 1: Ask the current owner to move the asset.
  steps.push({
    name: 'askToMove',
    request: {
      to: parties.from_owner,
      amount
      // Additional fields (note, app_symbol, app_key) will be added later
    }
  });

  // Step 2: Depending on the pattern, plan the change operation
  if (pattern === 'self-vault') {
    // ChangeVault or changeOwner to the same owner with a to_vault hint
    steps.push({
      name: 'changeOwner',
      request: {
        from: parties.from_owner,
        to: parties.from_owner,
        amount
        // to_vault will be supplied by the caller if needed
      }
    });
  } else if (pattern === 'owner-to-owner') {
    // Single recipient
    steps.push({
      name: 'changeOwner',
      request: {
        from: parties.from_owner,
        to: parties.to_owner,
        amount
      }
    });
  } else if (pattern === 'appliance-conditional') {
    // Use changeOwners if multiple buyers are specified, otherwise changeOwner
    if (parties.buyers && parties.buyers.length > 1) {
      const sum_of = parties.buyers.map((id) => ({ to: id, amount: 1 }));
      steps.push({
        name: 'changeOwners',
        request: {
          from: parties.from_owner,
          sum_of,
          amount
        }
      });
    } else {
      // Single buyer or unspecified
      const buyer = parties.buyers && parties.buyers.length === 1 ? parties.buyers[0] : parties.to_owner;
      steps.push({
        name: 'changeOwner',
        request: {
          from: parties.from_owner,
          to: buyer,
          amount
        }
      });
    }
  }

  return { steps, condition: condition || null };
}

/**
 * Generate Cloud API request bodies from a flow plan.  This function
 * hydrates the steps produced by plan_flow with the necessary appliance
 * information (app_symbol and app_key) and returns a list of request objects
 * keyed by the endpoint name.
 *
 * @param {Object} plan - The flow plan returned by plan_flow.
 * @param {Object} app - Application parameters containing app_symbol and app_key.
 * @returns {Object} An object with keys mapping to API endpoints (issue?, askToMove, changeOwner, changeOwners).
 */
function generate_requests(plan, app) {
  const requests = {};
  if (!plan || !app) {
    return requests;
  }
  const { steps, condition } = plan;
  steps.forEach((step) => {
    const { name, request } = step;
    if (name === 'askToMove') {
      requests.askToMove = {
        to: request.to,
        app_symbol: app.app_symbol,
        app_key: app.app_key,
        note: { behavior: 'transfer', body: 'Please approve the move.' },
        amount: request.amount,
        // If condition has a time component it could be passed via add_settle_time
        add_settle_time: condition && condition.type === 'time' ? condition.hours || 0 : undefined
      };
    } else if (name === 'changeOwner') {
      requests.changeOwner = {
        from: request.from,
        to: request.to,
        ask_to_move_id: '<ask-id-placeholder>',
        app_symbol: app.app_symbol,
        app_key: app.app_key,
        amount: request.amount
      };
      // Pass along a to_vault hint if present
      if (request.to_vault) {
        requests.changeOwner.to_vault = request.to_vault;
      }
    } else if (name === 'changeOwners') {
      requests.changeOwners = {
        from: request.from,
        sum_of: request.sum_of,
        ask_to_move_id: '<ask-id-placeholder>',
        app_symbol: app.app_symbol,
        app_key: app.app_key,
        amount: request.amount
      };
    }
  });
  return requests;
}

module.exports = {
  chooseConfig,
  recommend_configuration,
  plan_flow,
  generate_requests
};