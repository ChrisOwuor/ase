const express = require('express');
const { createOrder, getOrders, getOrdersForFarmer, acceptOrder, getOrdersForUser, confirmPayment, releaseProduct } = require('../controllers/OrderController');
const authMiddleware = require('../middlewares/authMiddleware');
const orderRouter = express.Router();

orderRouter.post('/create', authMiddleware(['admin', 'farmer','buyer']), createOrder);
orderRouter.get('/', authMiddleware(['admin']), getOrders);//statistics
orderRouter.get('/farmer', authMiddleware(['farmer']), getOrdersForFarmer);
orderRouter.put('/:id/accept', acceptOrder);
orderRouter.put('/:id/confirm-payment', confirmPayment);
orderRouter.put('/:id/release', releaseProduct);
orderRouter.get('/buyer', authMiddleware(['buyer']), getOrdersForUser);
module.exports = orderRouter;
