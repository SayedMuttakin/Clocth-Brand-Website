const Joi = require('joi');

function validateOrder(order) {
  const schema = Joi.object({
    customerInfo: Joi.object({
      name: Joi.string().required(),
      email: Joi.string().email().required(),
      phone: Joi.string().required()
    }).required(),
    items: Joi.array().items(
      Joi.object({
        product: Joi.string().required(),
        quantity: Joi.number().min(1).required(),
        price: Joi.number().required(),
        color: Joi.string().allow('', null),
        size: Joi.string().allow('', null)
      })
    ).required(),
    shippingAddress: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zipCode: Joi.string().required(),
      country: Joi.string().default('US')
    }).required(),
    paymentMethod: Joi.string().valid('cash_on_delivery', 'stripe').default('cash_on_delivery'),
    paymentStatus: Joi.string().valid('pending', 'paid', 'failed').default('pending'),
    totalAmount: Joi.number().required(),
    shippingCost: Joi.number().default(0),
    tax: Joi.number().default(0)
  });

  return schema.validate(order);
}

module.exports = { validateOrder }; 