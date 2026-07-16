const pool = require('../config/database');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer storage for Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'sweeping-rota/avatars',
        format: async (req, file) => {
            // Convert to jpg for consistency
            return 'jpg';
        },
        public_id: (req, file) => {
            // Generate unique filename with user ID
            const userId = req.session?.userId || 'unknown';
            return `user_${userId}_${Date.now()}`;
        },
        transformation: [
            { width: 200, height: 200, crop: 'fill', gravity: 'face' },
            { quality: 'auto:good' }
        ]
    }
});

// Configure multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'));
        }
    }
});

class ProfileController {
    // ============================================
    // GET PROFILE
    // ============================================
    static async getProfile(req, res) {
    try {
        const userId = req.session.userId;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated'
            });
        }
        
        // Get user data
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Get user stats
        const [stats] = await pool.query(
            `SELECT 
                COUNT(CASE WHEN is_completed = TRUE THEN 1 END) as total_sweeps,
                COUNT(CASE WHEN is_completed = TRUE AND schedule_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as monthly_sweeps,
                MAX(completed_at) as last_sweep_date
             FROM rota_schedule 
             WHERE user_id = ?`,
            [userId]
        );
        
        // Get current streak
        const [streak] = await pool.query(
            `SELECT COUNT(*) as streak 
             FROM rota_schedule 
             WHERE user_id = ? 
             AND is_completed = TRUE 
             AND schedule_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
             ORDER BY schedule_date DESC`,
            [userId]
        );
        
        // Get rank - FIXED: use backticks for reserved keyword
        const [rankResult] = await pool.query(
            `SELECT COUNT(*) + 1 as \`rank\`
             FROM (
                 SELECT user_id, COUNT(*) as total
                 FROM rota_schedule
                 WHERE is_completed = TRUE
                 GROUP BY user_id
             ) as user_stats
             WHERE total > (
                 SELECT COUNT(*)
                 FROM rota_schedule
                 WHERE user_id = ? AND is_completed = TRUE
             )`,
            [userId]
        );
        
        // Update last active
        await pool.query(
            'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?',
            [userId]
        );
        
        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                bio: user.bio || '',
                avatar_url: user.avatar_url || '',
                theme_preference: user.theme_preference || 'light',
                created_at: user.created_at
            },
            stats: {
                total_sweeps: stats[0]?.total_sweeps || 0,
                monthly_sweeps: stats[0]?.monthly_sweeps || 0,
                streak: streak[0]?.streak || 0,
                rank: rankResult[0]?.rank || 1,
                last_sweep: stats[0]?.last_sweep_date
            }
        });
    } catch (error) {
        console.error('Error getting profile:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
    // ============================================
    // UPDATE PROFILE
    // ============================================
    static async updateProfile(req, res) {
        try {
            const userId = req.session.userId;
            const { name, email, phone, bio } = req.body;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Not authenticated'
                });
            }
            
            if (!name || !email) {
                return res.status(400).json({
                    success: false,
                    error: 'Name and email are required'
                });
            }
            
            // Check if email is taken by another user
            const [existing] = await pool.query(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [email, userId]
            );
            
            if (existing.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Email already in use by another user'
                });
            }
            
            // Update user
            await pool.query(
                `UPDATE users 
                 SET name = ?, email = ?, phone = ?, bio = ?, profile_updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [name, email, phone || null, bio || null, userId]
            );
            
            // Get updated user
            const updatedUser = await User.findById(userId);
            
            res.json({
                success: true,
                message: 'Profile updated successfully!',
                user: {
                    id: updatedUser.id,
                    name: updatedUser.name,
                    email: updatedUser.email,
                    phone: updatedUser.phone || '',
                    bio: updatedUser.bio || '',
                    avatar_url: updatedUser.avatar_url || ''
                }
            });
        } catch (error) {
            console.error('Error updating profile:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // ============================================
    // UPLOAD AVATAR
    // ============================================
    static async uploadAvatar(req, res) {
        try {
            const userId = req.session.userId;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Not authenticated'
                });
            }
            
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No file uploaded'
                });
            }
            
            // Get old avatar URL
            const [user] = await pool.query(
                'SELECT avatar_url FROM users WHERE id = ?',
                [userId]
            );
            const oldAvatarUrl = user[0]?.avatar_url;
            
            // Update user with new avatar URL
            await pool.query(
                'UPDATE users SET avatar_url = ? WHERE id = ?',
                [req.file.path, userId]
            );
            
            // Delete old avatar from Cloudinary (if exists and not default)
            if (oldAvatarUrl && !oldAvatarUrl.includes('default-avatar')) {
                try {
                    const publicId = oldAvatarUrl.split('/').pop().split('.')[0];
                    await cloudinary.uploader.destroy(`sweeping-rota/avatars/${publicId}`);
                } catch (deleteError) {
                    console.log('Could not delete old avatar:', deleteError.message);
                }
            }
            
            res.json({
                success: true,
                message: 'Avatar updated successfully!',
                avatar_url: req.file.path
            });
        } catch (error) {
            console.error('Error uploading avatar:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // ============================================
    // CHANGE PASSWORD
    // ============================================
    static async changePassword(req, res) {
        try {
            const userId = req.session.userId;
            const { currentPassword, newPassword, confirmPassword } = req.body;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Not authenticated'
                });
            }
            
            if (!currentPassword || !newPassword || !confirmPassword) {
                return res.status(400).json({
                    success: false,
                    error: 'All password fields are required'
                });
            }
            
            if (newPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    error: 'New password must be at least 6 characters'
                });
            }
            
            if (newPassword !== confirmPassword) {
                return res.status(400).json({
                    success: false,
                    error: 'New passwords do not match'
                });
            }
            
            // Get user with password hash
            const [user] = await pool.query(
                'SELECT * FROM users WHERE id = ?',
                [userId]
            );
            
            if (!user || user.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }
            
            // Verify current password
            const validPassword = await bcrypt.compare(currentPassword, user[0].password_hash);
            
            if (!validPassword) {
                return res.status(401).json({
                    success: false,
                    error: 'Current password is incorrect'
                });
            }
            
            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            
            // Update password
            await pool.query(
                'UPDATE users SET password_hash = ? WHERE id = ?',
                [hashedPassword, userId]
            );
            
            res.json({
                success: true,
                message: 'Password changed successfully!'
            });
        } catch (error) {
            console.error('Error changing password:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // ============================================
    // DELETE ACCOUNT
    // ============================================
    static async deleteAccount(req, res) {
        try {
            const userId = req.session.userId;
            const { confirmPassword } = req.body;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Not authenticated'
                });
            }
            
            if (!confirmPassword) {
                return res.status(400).json({
                    success: false,
                    error: 'Password confirmation required'
                });
            }
            
            // Get user
            const [user] = await pool.query(
                'SELECT * FROM users WHERE id = ?',
                [userId]
            );
            
            if (!user || user.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }
            
            // Verify password
            const validPassword = await bcrypt.compare(confirmPassword, user[0].password_hash);
            
            if (!validPassword) {
                return res.status(401).json({
                    success: false,
                    error: 'Password is incorrect'
                });
            }
            
            // Delete user's rota entries
            await pool.query('DELETE FROM rota_schedule WHERE user_id = ?', [userId]);
            
            // Delete user's swap requests
            await pool.query('DELETE FROM swap_requests WHERE from_user_id = ? OR to_user_id = ?', [userId, userId]);
            
            // Delete user
            await pool.query('DELETE FROM users WHERE id = ?', [userId]);
            
            // Destroy session
            req.session.destroy((err) => {
                if (err) {
                    console.error('Error destroying session:', err);
                }
            });
            
            res.json({
                success: true,
                message: 'Account deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting account:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

// Export the upload middleware
ProfileController.upload = upload;

module.exports = ProfileController;