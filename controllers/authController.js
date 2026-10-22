const crypto = require('crypto');
const authService = require('../services/authService');

const register = async (req, res) => {
    const {name, email, password} = req.body;

    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string' || name.trim().length === 0 || email.trim().length === 0 || password.length === 0) return res.status(400).json({message: 'Invalid data'});

    const id = crypto.randomUUID();
    const user = {id, name: name.trim(), email: email.trim().toLowerCase(), password};

    try {
        const add = await authService.createUser(user);
        if (add.type === 'email_exists') return res.status(409).json({message: 'Email already registered'});
        return res.status(201).json(add.user);
    } catch (error) {
        console.error('Registration failed:', error.message);
        return res.status(500).json({message: 'Internal server error'});
    }
};

const login = async (req, res) => {
    const {email, password} = req.body;
    if (typeof email !== 'string' || typeof password !== 'string' || email.trim().length === 0 || password.length === 0)
        return res.status(400).json({message: 'Invalid data'});

    try {
        const result = await authService.loginUser({email: email.trim().toLowerCase(), password});
        if (result.type === 'invalid_credentials') return res.status(401).json({message: 'Invalid email or password'});
        return res.status(200).json({user: result.user, token: result.token});
    } catch (error) {
        console.error('Login failed:', error.message);
        return res.status(500).json({message: 'Internal server error'});
    }
};

module.exports = {register, login};