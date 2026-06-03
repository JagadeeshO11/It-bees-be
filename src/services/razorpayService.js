const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createOrder = async (amount, currency = 'INR', receipt) => {
  const options = {
    amount: Math.round(amount * 100), // amount in smallest currency unit
    currency,
    receipt,
  };
  return razorpay.orders.create(options);
};

const verifySignature = (orderId, paymentId, signature) => {
  const text = orderId + "|" + paymentId;
  const generated_signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(text)
    .digest("hex");
  return generated_signature === signature;
};

module.exports = { createOrder, verifySignature };
