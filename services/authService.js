const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const createUser = async (user) => {
    const {id, name, email, password} = user;
    const check = await pool.query('select * from users where email = $1', [email]);
    if (check.rows.length > 0) return {type: 'email_exists'};

    try {
        const hashed = await bcrypt.hash(password, 12);
        const new_user = await pool.query('INSERT INTO users (id,name,email,password_hash)VALUES ($1,$2,$3,$4) ' + 'RETURNING id, name, email, created_at', [id, name, email, hashed]);
        return {type: 'created', user: new_user.rows[0]};
    } catch (error) {
        throw error;
    }
};

const loginUser = async (user) => {
    const {email, password} = user;
    const check = await pool.query('SELECT id, name, email, password_hash FROM users WHERE email = $1', [email]);
    if (check.rows.length === 0) return {type: 'invalid_credentials'};
    const match_password = await bcrypt.compare(password, check.rows[0].password_hash);
    if (!match_password) return {type: 'invalid_credentials'};

    const token = jwt.sign({sub: check.rows[0].id}, process.env.JWT_SECRET, {expiresIn: '1h'});
    return {
        type: 'authenticated',
        user: {id: check.rows[0].id, name: check.rows[0].name, email: check.rows[0].email},
        token
    };
};

module.exports = {createUser, loginUser};