const mongoose = require("../../common/database")();
const customerSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    full_name: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
},{timestamps: true});

const customerModel = mongoose.model("Customers", customerSchema, "customers");
module.exports = customerModel;