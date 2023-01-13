
// eslint-disable-next-line no-undef
const productCollection = require('../models/productSchema')
// eslint-disable-next-line no-undef
const categoryCollection = require('../models/categorySchema')
// eslint-disable-next-line no-undef
const cartCollection = require('../models/cartSchema')
// eslint-disable-next-line no-undef
const mongoose = require('mongoose')
// eslint-disable-next-line no-undef
const wishlistCollection = require('../models/wishlistSchema')
// eslint-disable-next-line no-undef, no-unused-vars
// const orderCollection = require('../models/oderSchema')
// eslint-disable-next-line no-undef
const userCollection = require('../models/userSchema')
// eslint-disable-next-line no-undef, no-unused-vars
const paypal = require("paypal-rest-sdk");
//get method
const cartList = async (req, res) => {
  try {

    const user = await userCollection.findOne({ _id: req.session.user });
    const brands = await productCollection.distinct("brand");
    const categories = await categoryCollection.find({ status: true });
    const cartData = await cartCollection.aggregate([
      // eslint-disable-next-line no-undef
      { $match: { userId: mongoose.Types.ObjectId(req.session.user) } },

      { $unwind: "$cartItem" },
      {
        $project: {
          productId: "$cartItem.productId",
          qty: "$cartItem.qty",
          userId: "$userId",
        },
      },

      {
        $lookup: {
          from: "poducts",
          localField: "productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $project: {
          name: "$productDetails.name",
          price: "$productDetails.price",
          image: "$productDetails.image",
          description: "$productDetails.description",
          qty: "$qty",
          id: "$productDetails._id",
          userId: "$userId",
        },
      },
      {
        $addFields: {
          total: { $multiply: ["$price", "$qty"] },
        },
      },
    ]);
    const subtotal = cartData.reduce(function (acc, curr) {
      acc = acc + curr.total;
      return acc;
    }, 0);
    res.render("cart", { 

      brands,
      categories,
      cartData,
      user,
      subtotal, });
  } catch (error) {
    console.log(error);
  }
};
//get method cart product check
const add_to_cart = async (req, res) => {
  try {
    const proId = req.body.Id;
    // eslint-disable-next-line no-unused-vars
    const Id = mongoose.Types.ObjectId(proId);
    const productData = await productCollection.findOne({ _id: proId });
    const id = mongoose.Types.ObjectId(req.session.user);
    if (productData.stock > 0) {
      const cartExist = await cartCollection.findOne({ userId: id });
      if (cartExist) {
        const exist1 = await cartCollection.aggregate([
          {
            $match: {
              $and: [
                { userId: mongoose.Types.ObjectId(req.session.user) },
                {
                  cartItem: {
                    $elemMatch: {
                      productId: new mongoose.Types.ObjectId(proId),
                    },
                  },
                },
              ],
            },
          },
        ]);
        if (exist1.length === 0) {
          await cartCollection.updateOne(
            { userId: id },
            {
              $push: { cartItem: { productId: proId } },
            }
          );
          const cartData = await cartCollection.findOne({ userId: id });
          const count = cartData.cartItem.length;
          res.json({ success: true, count });
        } else {
          res.json({ exist: true });
        }
      } else {
        const addCart = new cartCollection({
          userId: id,
          cartItem: [{ productId: proId }],
        });
        await addCart.save();
        const cartData = await cartCollection.findOne({ userId: id });
        const count = cartData.cartItem.length;
        //  console.log(count);
        res.json({ success: true, count });
      }
    } else {
      res.json({ outofStock: true });
    }
  } catch (error) {
    console.log(error);
  }
};

const productQtyAdd = async (req, res) => {
  try {
    const data = req.body;
    // console.log(data);
    const proId = data.Id;

    const qty = parseInt(data.qty);
    const productData = await productCollection.findOne({ _id: proId });
    // console.log(productData);
    if (productData.stock > 0) {
      if (qty < 10) {
        const price = productData.price;
        await cartCollection.updateOne(
          { userId: req.session.user, "cartItem.productId": proId },
          { $inc: { "cartItem.$.qty": 1 } }
        );
        res.json({ price });
      } else {
        res.json({ limit: true });
      }
    } else {
      res.json({ outStock: true });
    }
  } catch (error) {
    console.log(error);
  }
};

const productQtySub = async (req, res) => {
  try {
    const data = req.body;
    const proId = data.Id;
    const qty = parseInt(data.qty);
    const productData = await productCollection.findOne({ _id: proId });
    if (productData.stock > 0) {
      if (qty > 1) {
        const price = productData.price;
        await cartCollection.updateOne(
          { userId: req.session.user, "cartItem.productId": proId },
          { $inc: { "cartItem.$.qty": -1 } }
        );
        res.json({ price });
      } else {
        res.json({ limit: true });
      }
    } else {
      res.json({ outStock: true });
    }
  } catch (error) {
    console.log(error);
  }
};

const deleteCart = async (req, res) => {
  try {
    const userId = req.session.user;
    const id = req.query.id;
    await cartCollection.updateOne(
      { userId: userId },
      { $pull: { cartItem: { productId: id } } }
    );
    res.redirect("/cartlist");
  } catch (error) {
    console.log(error);
  }
};

const view_wishList = async (req, res) => {
  try {
    const user = await userCollection.findOne({ _id: req.session.user });
    // const brands = await productCollection.distinct("brand");
    const categories = await categoryCollection.find({ status: true });
    const wishList = await wishlistCollection.aggregate([
      { $match: { userId: user._id } },
      { $unwind: "$wishList" },
      {
        $project: {
          productId: "$wishList.productId",
          qty: "$wishList.qty",
        },
      },
      {
        $lookup: {
          from: "poducts",
          localField: "productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $project: {
          name: "$productDetails.name",
          price: "$productDetails.price",
          image: "$productDetails.image",
          qty: "$qty",
          id: "$productDetails._id",
        },
      },
      {
        $addFields: {
          total: { $multiply: ["$price", "$qty"] },
        },
      },
    ]);
    res.render("wishlist", { user, categories, wishList });
  } catch (error) {
    console.log(error);
  }
};

const wishList = async (req, res) => {
  try {
    const data = req.body;
    const id = data.prodId;
    const userId = req.session.user;
    const Id = mongoose.Types.ObjectId(userId);
    const wish = await wishlistCollection.findOne({ userId: Id });
    if (wish) {
      let wishlistEx = wish.wishList.findIndex(
        (wishList) => wishList.productId == id
      );
      if (wishlistEx != -1) {
        res.json({ wish: true });
      } else {
        await wishlistCollection.updateOne(
          { userId: Id },
          {
            $push: { wishList: { productId: id } },
          }
        );
        const wishlistData = await wishlistCollection.findOne({ userId: Id });
        const count = wishlistData.wishList.length;
        res.json({ success: true, count });
      }
    } else {
      const addWish = new wishlistCollection({
        userId: userId,
        wishList: [{ productId: id }],
      });
      await addWish.save();
      const wishlistData = await wishlistCollection.findOne({ userId: Id });
      const count = wishlistData.wishList.length;
      res.json({ success: true, count });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const deleteWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    const id = req.query.id;
    await wishlistCollection.updateOne(
      { userId: userId },
      { $pull: { wishList: { productId: id } } }
    );
    res.redirect("/wishlist");
  } catch (error) {
    console.log(error);
  }
};

//checkOut

const checkout = async (req, res) => {
  try {
    //  let subtotal = req.query.subtotal;
    let cartItems = await cartCollection.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(req.session.user) } },
      { $unwind: "$cartItem" },
      {
        $project: {
          productId: "$cartItem.productId",
          qty: "$cartItem.qty",
        },
      },
      {
        $lookup: {
          from: "poducts",
          localField: "productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $project: {
          name: "$productDetails.name",
          price: "$productDetails.price",
          qty: "$qty",
          id: "$productDetails._id",
          userId: "$userId",
        },
      },
      {
        $addFields: {
          total: { $multiply: ["$price", "$qty"] },
        },
      },
    ]);
    // console.log(cartItems)

    const subtotal = cartItems.reduce((acc, curr) => {
      acc = acc + curr.total;
      return acc;
    }, 0);
    const user = await userCollection.findOne({ _id: req.session.user });
    const brands = await productCollection.distinct("brand");
    const categories = await categoryCollection.find({ status: true });
    const address = await userCollection.aggregate([
      { $match: { _id: mongoose.Types.ObjectId(req.session.user) } },
      { $unwind: "$address" },
      {
        $project: {
          name: "$address.name",
          addressline1: "$address.addressline1",
          addressline2: "$address.addressline2",
          district: "$address.distict",
          state: "$address.state",
          country: "$address.country",
          pin: "$address.pin",
          mobile: "$address.mobile",
          id: "$address._id",
        },
      },
    ]);
    res.render("checkout.ejs", {
      user,
      brands,
      categories,
      address,
      cartItems,
      subtotal,
    });
  } catch (error) {
    console.log(error);
  }
};

//checkout post
const postCheckOut = async (req, res) => {
  try {
    if (req.body.payment_mode == "COD") {
      await cartCollection.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(req.session.user) } },
        { $unwind: "$cartItem" },
        {
          $project: {
            _id: 0,
            productId: "$cartItem.productId",
            quantity: "$cartItem.qty",
          },
        },
      ]);

      await cartCollection.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(req.session.user) } },
        { $unwind: "$cartItem" },
        {
          $project: {
            productId: "$cartItem.productId",
            qty: "$cartItem.qty",
          },
        },
        {
          $lookup: {
            from: "poducts",
            localField: "productId",
            foreignField: "_id",
            as: "productDetails",
          },
        },
        { $unwind: "$productDetails" },
        {
          $project: {
            price: "$productDetails.price",
            qty: "$qty",
            id: "$productDetails._id",
            userId: "$userId",
          },
        },
        {
          $addFields: {
            total: { $multiply: ["$price", "$qty"] },
          },
        },
      ]);

      // const subtotal = cartItems.reduce((acc, curr) => {
      //   acc = acc + curr.total;
      //   return acc;
      // }, 0);


      // console.log(req.body);
      // console.log(subtotal)
      //     if (req.body.couponid === ''){

      //     const orderDetails = new orderCollection({
      //       userId: req.session.user,
      //       name: req.body.name,
      //       number: req.body.mobile,
      //       address: {
      //         addressline1: req.body.addressline1,
      //         addressline2: req.body.addressline2,
      //         district: req.body.district,
      //         state: req.body.state,
      //         country: req.body.country,
      //         pin: req.body.pin,
      //       },
      //       orderItems: productData,
      //       subTotal: subtotal,
      //       totalAmount: subtotal,
      //       paymentMethod: "COD",
      //     });
      //     // console.log(orderDetails);
      //     await orderDetails.save();
      //     let productDetails=productData
      //     // console.log(productDetails);
      // for(let i =0;i<productDetails.length;i++){
      //     await product.updateOne({_id:productDetails[i].productId},{$inc:{stock:-(productDetails[i].quantity)}})
      // }
      //   }else{
      //   await coupon.updateOne({_id:req.body.couponid}, { $push: { users: { userId:req.session.user} } })

      //   const orderDetails = new orderCollection({
      //     userId: req.session.user,
      //     name: req.body.name,
      //     number: req.body.mobile,
      //     address: {
      //       addressline1: req.body.addressline1,
      //       addressline2: req.body.addressline2,
      //       district: req.body.district,
      //       state: req.body.state,
      //       country: req.body.country,
      //       pin: req.body.pin,
      //     },
      //     orderItems: productData,
      //     couponUsed:req.body.couponid,
      //     subTotal: subtotal,
      //     totalAmount: req.body.total,
      //     paymentMethod: "COD",
      //   });
      //   // console.log(orderDetails);
      //   await orderDetails.save();
      // }
    }
    if (req.body.payment_mode == "pay") {
      await cartCollection.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(req.session.user) } },
        { $unwind: "$cartItem" },
        {
          $project: {
            _id: 0,
            productId: "$cartItem.productId",
            quantity: "$cartItem.qty",
          },
        },
      ]);
      let cartItems = await cartCollection.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(req.session.user) } },
        { $unwind: "$cartItem" },
        {
          $project: {
            productId: "$cartItem.productId",
            qty: "$cartItem.qty",
          },
        },
        {
          $lookup: {
            from: "poducts",
            localField: "productId",
            foreignField: "_id",
            as: "productDetails",
          },
        },
        { $unwind: "$productDetails" },
        {
          $project: {
            price: "$productDetails.price",
            qty: "$qty",
            id: "$productDetails._id",
            userId: "$userId",
          },
        },
        {
          $addFields: {
            total: { $multiply: ["$price", "$qty"] },
          },
        },
      ]);
      console.log(cartItems);
      const subtotal = cartItems.reduce((acc, curr) => {
        acc = acc + curr.total;
        return acc;
      }, 0);


      paypal.configure({
        mode: "sandbox", //sandbox or live
        client_id:
          "AZlCOOPiXuoptUcu4w-DzOdbucMs9x7eMqyVBtGXGY3B3AC7ID66RggAGl6K9EdRZLLlhWsaT6i8TsQF",
        client_secret:
          "EHzygZ-5LLHB-34MTSY4s-I96Rf6MJafMUifpWXWWs5sx2x7B4YmZ07ScniIAq9AyLeGc__vB5iWBLa-",
      });
       
          const create_payment_json = {
            "intent": "sale",
            "payer": {
                "payment_method": "paypal"
            },
            "redirect_urls": {
                "return_url": "http://localhost:4000/home",
                "cancel_url": "http://localhost:4000/checkout"
            },
            "transactions": [{
                "item_list": {
                    "items": [{
                        "name": "item",
                        "sku": "item",
                        "price":subtotal,
                        "currency": "USD",
                        "quantity": 1
                    }]
                },
                "amount": {
                    "currency": "USD",
                    "total":subtotal
                },
                "description": "This is the payment description."
            }]
          };
          paypal.payment.create(create_payment_json, async function (error, payment) {
            if (error) {
              throw error;
            } else {
              for (let i = 0; i < payment.links.length; i++) {
                if (payment.links[i].rel === "approval_url") {
                  res.redirect(payment.links[i].href);
          
          
          }
              }
            }
          });

      // console.log(req.body);
      // console.log(subtotal)
      //   if (req.body.couponid === ''){
      //   const orderDetails =({
      //     userId: req.session.user,
      //     name: req.body.name,
      //     number: req.body.mobile,
      //     address: {
      //       addressline1: req.body.addressline1,
      //       addressline2: req.body.addressline2,
      //       district: req.body.district,
      //       state: req.body.state,
      //       country: req.body.country,
      //       pin: req.body.pin,
      //     },
      //     orderItems: productData,
      //     subTotal: subtotal,
      //     totalAmount: subtotal,
      //     paymentMethod: "Online Payment",
      //   });
      //   var options = {
      //     amount: subtotal*100,  // amount in the smallest currency unit
      //     currency: "INR",
      //     receipt: "order_rcptid_11"
      //   };

      //   instance.orders.create(options, function(err, order) {
      //     if(err){
      //     console.log(err);
      //     console.log('online payment error');
      //     }else{
      //       // console.log(order);
      //       res.json({order,orderDetails})
      //     }
      //   });
      // }else{
      //   const orderDetails = new orderCollection({
      //     userId: req.session.user,
      //     name: req.body.name,
      //     number: req.body.mobile,
      //     address: {
      //       addressline1: req.body.addressline1,
      //       addressline2: req.body.addressline2,
      //       district: req.body.district,
      //       state: req.body.state,
      //       country: req.body.country,
      //       pin: req.body.pin,
      //     },
      //     orderItems: productData,
      //     couponUsed:req.body.couponid,
      //     subTotal: subtotal,
      //     totalAmount: req.body.total,
      //     paymentMethod: "Online Payment",
      //   });
      //   console.log(orderDetails);
      // }
    }
  } catch (error) {
    console.log(error);
  }
};

// eslint-disable-next-line no-undef
module.exports = {
  cartList,
  add_to_cart,
  productQtyAdd,
  productQtySub,
  deleteCart,
  wishList,
  view_wishList,
  deleteWishlist,
  checkout,
  postCheckOut,
};
