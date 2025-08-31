/*
 * JSON Schemas for input and output types used by the MCP service.
 *
 * These schemas can be used with JSON Schema validators to ensure
 * proper structure of incoming requests.  They are simplified
 * versions of the definitions outlined in the MCP specification.
 */

const UseCaseInput = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    interchangeability: {
      type: 'string',
      enum: ['strict-1:1', 'face-interchangeable', 'series-bounded', 'unknown']
    },
    needs_denominations: { type: 'boolean' },
    needs_series: { type: 'boolean' },
    unit_is_unique: { type: 'boolean' },
    total_representation: {
      type: 'string',
      enum: ['amount-only', 'unit-count', 'mixed', 'unknown']
    },
    transfer_pattern: {
      type: 'string',
      enum: ['self-vault', 'owner-to-owner', 'appliance-conditional', 'unknown']
    },
    partial_transfers: { type: 'boolean' }
  },
  required: ['description'],
  additionalProperties: true
};

const BuildRecommendation = {
  type: 'object',
  properties: {
    configuration: { type: 'string', enum: ['Symmetric', 'Denomination', 'Series'] },
    amountCountRelation: { type: 'string' },
    interchangeability: { type: 'string' },
    appliance_responsibility: { type: 'array', items: { type: 'string' } },
    cloud_api_guarantees: { type: 'array', items: { type: 'string' } },
    rationale: { type: 'string' },
    typical_examples: { type: 'array', items: { type: 'string' } }
  },
  required: ['configuration', 'amountCountRelation', 'interchangeability'],
  additionalProperties: true
};

const FlowInput = {
  type: 'object',
  properties: {
    entry: { type: 'string', enum: ['treasury', 'owner-vault', 'appliance'] },
    pattern: { type: 'string', enum: ['self-vault', 'owner-to-owner', 'appliance-conditional'] },
    condition: { type: ['object', 'null'] },
    config: { type: 'string', enum: ['Symmetric', 'Denomination', 'Series'] },
    amount: { type: 'number' },
    parties: {
      type: 'object',
      properties: {
        from_owner: { type: 'string' },
        to_owner: { type: 'string' },
        buyers: { type: 'array', items: { type: 'string' } }
      },
      required: ['from_owner'],
      additionalProperties: true
    }
  },
  required: ['entry', 'pattern', 'config', 'amount', 'parties'],
  additionalProperties: true
};

module.exports = {
  UseCaseInput,
  BuildRecommendation,
  FlowInput
};