    const moment = require("moment");
    const categoryModel = require("../models/category");
    const commentModel = require("../models/comment");
    const productModel = require("../models/product");
    const customerModel = require("../models/customer");
    const orderModel = require("../models/order")
    const path = require("path");
    const ejs = require("ejs")
    const { response } = require("express");
    const vndPrice = require("../../lib/VnPrice")
    const timesAgo = require("../../lib/timesAgo")
    const transporter = require("../../common/transporter");
    const badWordsLists = require("../../lib/addBadWords")
    // lọc từ ngữ phản cảm

    const Filter = require('bad-words');
    const filter = new Filter();
    const badWordsList = badWordsLists.badWordsListss; // Thêm từ cần lọc vào đây
    filter.addWords(...badWordsList);

        const { log } = require("console");
    // mã hóa mk
    const sha1 = require("js-sha1");
    const bcrypt = require("bcrypt");
    const pagination = require("../../common/pagination");
    const home = async (req, res) => {
        
        const limit = 6
        const featured = await productModel
            .find({
                featured: 1
            })
            .sort({ _id: -1 })
            .limit(limit)
            ;
        const lastest = await productModel
            .find()
            .limit(limit)
            .sort({ _id: -1 });
        res.render("site/index", {
            featured,
            lastest,
            vndPrice
        });
    }
    const category = async (req, res) => {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = page*limit - limit;
        const totalRows = await productModel.find({cat_id:id}).countDocuments();
        const totalPages = Math.ceil(totalRows / limit);
        const category = await categoryModel.findById(id);
        const {title}  = await categoryModel.findById(id);
        const products = await productModel
            .find({
            cat_id: id,
            })
            .sort({_id : -1})
            .limit(limit)
            .skip(skip)
        const total = totalRows;
        res.render("site/category", {
            category,
            products,
            title,
            vndPrice,
            total,
            pages: pagination(page, limit, totalRows),
            page,
            totalPages

        });

    }

    // hàm lọc 
    const cleanString = (string) => {
        let cleanString = string;
        badWordsList.forEach((word) => {
        const regex = new RegExp(word, "gi"); 
        cleanString = cleanString.replace(regex, "*".repeat(word.length));
        });
        return cleanString;
    };
    
    const product = async (req, res) => {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = page*limit -limit;
        const totalRows = await commentModel.find({ prd_id: id,is_allowed: true})
            .countDocuments()
        const totalPages = Math.ceil(totalRows/ limit)
        const product = await productModel.findById(id);
        const comments = await commentModel
            .find({ prd_id: id})
            .sort({ _id: -1 })
            .limit(limit)
            .skip(skip)
        
        res.render("site/product", {
            product,
            comments,
            moment,
            vndPrice,
            timesAgo,
            pages: pagination(page, limit, totalRows),
            page,
            totalPages
        });

    }

    const comment = async (req, res) => {
        const { id } = req.params;
        const { full_name, email, body } = req.body;
        const comment = {
            prd_id: id,
            full_name,
            email,
            body: body,
        }
        await new commentModel(comment).save();
        res.redirect(req.path);
    };

    const search = async (req, res) => {
        const { keyword } = req.query;
        const products = await productModel.find({
            $text: {
                $search: keyword,
            }
        })
        res.render("site/search", {
            products,
            keyword
        });

    }

    const addToCart = async (req, res) => {
        const items = req.session.cart;
        const { id, qty } = req.body;
        let isProductExists = false;
        const newItems = items.map((item) => {
            if (item.id === id) {
                item.qty += Number(qty);
                isProductExists = true;
            }
            return item;
        });
        if (!isProductExists) {
            const product = await productModel.findById(id);
            newItems.push({
                _id: id,
                name: product.name,
                price: product.price,
                thumbnail: product.thumbnail,
                qty: Number(qty),
            });
        }
        req.session.cart = newItems;
        res.redirect("/cart");
    }

    const cart = async (req, res) => {
        const {email} = req.session;
        const customer = await customerModel.findOne({email});
        const items = req.session.cart;
        const product = productModel.find();
        // const order = await orderModel.save();
        res.render("site/cart", {
            items,
            vndPrice,
            email,
            customer,
            product
        });
    }

    const historyOrder = async (req, res) => {
        const {email} = req.session; // kiểm tra xem đăng nhập chưa
        if(email){
            const customer = await customerModel.findOne({email}) // tìm thông tin người dùng thông qua thông tin đã đăng ký
            if(customer){ // nếu có người dùng đó bắt đầu lọc sản phẩm đã mua
                const page = parseInt(req.query.page) || 1;
                const limit = 5;
                const skip = page*limit -limit;
                const totalRows = await orderModel.findOne({email}).countDocuments();
                const totalPages = Math.ceil(totalRows/ limit)
                const items = req.session.cart; // lấy giỏ hàng
                const product = productModel.find(); // duyệt sản phẩm
                const orders = await orderModel
                    .find({email})
                    .populate('items.prd_id') // tham chiếu dữ liệu sang thằng product
                    .skip(skip)
                    .limit(limit)
                res.render("site/historyOrder", { // chuyển hết thông tin model và các lib tự tạo sang ví dụ như vndprice..
                    items,
                    vndPrice,
                    email,
                    orders,
                    customer,
                    product,
                    pages: pagination(page, limit, totalRows),
                    page,
                    totalPages
                });
            }
        }else{
            res.redirect("/login"); // hoặc chuyển hướng người dùng đến trang đăng nhập
        }

    }


    const updateItemCart = (req, res) => {
        const { products } = req.body;
        const items = req.session.cart;
        const newItems = items.map((item) => {
            item.qty = Number(products[item._id]["qty"])
            return item;
        });
        req.session.cart = newItems;
        res.redirect("/cart");
    }

    const deleteItemCart = (req, res) => {
        const items = req.session.cart;
        const { id } = req.params;
        const newItems = items.filter((item) => item._id !== id)
        req.session.cart = newItems;
        // if(newItems.length === 0){
        //     res.alert("Khong con sp nao ");
        //     return;
        // }
        res.redirect("/cart")

    }
    const order = async (req, res) => {
        const {body} = req
        const items = req.session.cart;
        const viewFolder = req.app.get("views");

        const newOrder = new orderModel({
            email: body.email,
            phone: body.phone,
            name: body.name,
            address: body.address,
            items: items.map(item => ({
                prd_id: item._id,  
                prd_name: item.name,  
                prd_price: item.price, 
                prd_thumbnail: item.thumbnail, 
                prd_qty: item.qty, 
            }))
        });
        const html = await ejs.renderFile(path.join(viewFolder,"site/email-order.ejs"), {
            ...body,
            items,
            vndPrice,
        })
        // send mail with defined transport object
        await transporter.sendMail({
            from: '"VietPro Store 👻"VietPro.edu.vn@email.com', // sender address
            to: body.email, // list of receivers
            subject: "Xác nhận đơn hàng từ VietPro Store ", // Subject line
            html
        });
        await newOrder.save();
        req.session.cart = [];
        res.redirect("/success");
    }
    const success = (req, res) => {
        res.render("site/success");

    }

    const login = (req, res) =>{
        res.render("site/login",{data: {}})
    }

    const postLogin = async (req, res) =>{
        const {email, password} = req.body;
        const customer = await customerModel.findOne({email});
        if(customer){
            const sha1Password = sha1(password);
            const validPassword = await bcrypt.compare(sha1Password, customer.password);
            if(validPassword){
                req.session.email = email;
                req.session.password = password;
                res.redirect("/");
            }else{
                const error = "Tài khoản không hợp lệ";
                res.render("site/login",{data: {error}});
            }
        }else{
            const error = "Tài khoản không hợp lệ";
            res.render("site/login",{data: {error}});
        }

    }

    const register =  (req,res) =>{
        res.render("site/register",{data: {}});
    }

    const postRegister = async (req, res) =>{
        const {email, password, full_name, address, phone} = req.body;

        const existingUser = await customerModel.findOne({email});
        if(existingUser){
            const error = "Email đã được sử dụng, vui lòng chọn email khác!";
            res.render("site/register",{data : {error}})
        }else{
            const sha1Password = sha1(password);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(sha1Password, salt);
            const newCustomer = new customerModel({email, password: hashedPassword, full_name, address, phone});
            await newCustomer.save();
                    // lưu lại vào seesssion để đăng nhập luôn
            req.session.email = email;
            req.session.password = password;    
            req.session.full_name = full_name;    
            req.session.address = address;    
            req.session.phone = phone;    
            res.redirect("/");
        }

    }
    const logout = (req, res) =>{
        req.session.destroy();
        res.redirect("/");
    }
    module.exports = {
        home,
        category,
        product,
        comment,
        search,
        addToCart,
        updateItemCart,
        deleteItemCart,
        cart,
        historyOrder,
        order,
        success,
        login,
        register,
        postRegister,
        postLogin,
        logout,
        cleanString
    };
