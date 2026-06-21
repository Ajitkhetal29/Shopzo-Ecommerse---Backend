import cartModel from "../models/cart.js";

const addToCart = async (req, res) => {

    try {
        
        const { userId, productId, quantity } = req.body;

        let cart = await cartModel.findOne({ user: userId });

        if (!cart) {
            cart = new cartModel({
                user: userId,
                items: [{ product: productId, quantity }],
            });
        } else {

            // find for the any if the selected product already exists in the cart

            const existingItemIndex = cart.items.findIndex(
                (item) => item.product.toString() === productId
            );
            if (existingItemIndex > -1) {
                cart.items[existingItemIndex].quantity += quantity;
            } else {
                cart.items.push({ product: productId, quantity });
            }
            
        }

        await cart.save();


        

    } catch (error) {
        
    }


};
