const mongoose = require('mongoose');
const paymentschema = new mongoose.Schema({

      Name: {
        type: String,
        
        
      },

      withdrawCoin:{
        type: Number,
        
      },

      UpiId:{
        type: String,
        
      },
      




});

module.exports = mongoose.model('Payment', paymentschema);
