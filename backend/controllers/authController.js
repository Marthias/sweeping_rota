const User = require('../models/User');
const bcrypt = require('bcryptjs');

class AuthController {
    // Register new user
    static async register(req, res) {
        try {
            const { name, email, phone, password } = req.body;
            
            // Validate input
            if (!name || !email || !password) {
                return res.status(400).json({ 
                    error: 'Name, email and password are required' 
                });
            }
            
            // Check if user exists
            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({ 
                    error: 'User already exists' 
                });
            }
            
            // Create user
            const userId = await User.create({ name, email, phone, password });
            
            res.json({ 
                success: true, 
                message: 'User registered successfully! Please login.',
                userId 
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ 
                error: 'Registration failed. Please try again.' 
            });
        }
    }

    // Login user
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            
            if (!email || !password) {
                return res.status(400).json({ 
                    error: 'Email and password are required' 
                });
            }
            
            // Find user
            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({ 
                    error: 'Invalid email or password' 
                });
            }
            
            // Check password
            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) {
                return res.status(401).json({ 
                    error: 'Invalid email or password' 
                });
            }
            
            // Store session
            req.session.userId = user.id;
            req.session.user = {
                id: user.id,
                name: user.name,
                email: user.email
            };
            
            res.json({ 
                success: true, 
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ 
                error: 'Login failed. Please try again.' 
            });
        }
    }

    // Logout
    static async logout(req, res) {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ 
                    error: 'Logout failed' 
                });
            }
            res.json({ 
                success: true, 
                message: 'Logged out successfully' 
            });
        });
    }

    // Get current user
    static async getCurrentUser(req, res) {
        try {
            if (!req.session.userId) {
                return res.status(401).json({ 
                    error: 'Not authenticated' 
                });
            }
            
            const user = await User.findById(req.session.userId);
            if (!user) {
                return res.status(401).json({ 
                    error: 'User not found' 
                });
            }
            
            res.json({ user });
        } catch (error) {
            console.error('Get user error:', error);
            res.status(500).json({ 
                error: 'Failed to get user information' 
            });
        }
    }
}

module.exports = AuthController;