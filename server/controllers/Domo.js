const models = require('../models');
const Domo = models.Domo;

const makerPage = async (req, res) => {
    return res.render('app');
};

const makeDomo = async (req, res) => {
    if(!req.body.name || !req.body.age) {
        return res.status(400).json({error: 'Both name and age are required.'});
    }

    const domoData = {
        name: req.body.name,
        age: req.body.age,
        rating: req.body.rate,
        owner: req.session.account._id,
    };

    try {
        const newDomo = new Domo(domoData);
        await newDomo.save();
        return res.status(201).json({name: newDomo.name, age: newDomo.age, rating: newDomo.rating});
    } catch (err) {
        console.log(err);
        if(err.code === 11000) {
            return res.status(400).json({error: 'Domo already exists.'});
        }
        return res.status(500).json({error: 'An error occured making domo.'});
    }
};

const getDomos = async (req, res) => {
    try {
        const query = {owner: req.session.account._id};
        const docs = await Domo.find(query).select('name age').lean().exec();

        return res.json({domos: docs});
    } catch (err) {
        console.log(err);
        return res.status(500).json({error: 'Error retrieving domos!'});
    }
};

module.exports = {
    makerPage,
    makeDomo,
    getDomos,
};