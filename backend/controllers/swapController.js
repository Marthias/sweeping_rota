const Swap = require('../models/Swap');
const Rota = require('../models/Rota');

class SwapController {
    // Create swap request
    static async createRequest(req, res) {
        try {
            const { to_user_id, from_date, to_date, message } = req.body;
            const from_user_id = req.session.userId;
            
            if (!to_user_id || !from_date || !to_date) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields'
                });
            }
            
            const requestId = await Swap.createRequest({
                from_user_id,
                to_user_id,
                from_date,
                to_date,
                message
            });
            
            res.json({
                success: true,
                message: 'Swap request sent successfully!',
                requestId
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Get pending swaps for current user
    static async getPending(req, res) {
        try {
            const userId = req.session.userId;
            const requests = await Swap.getPendingRequests(userId);
            res.json({
                success: true,
                data: requests
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Get all swap requests (admin)
    static async getAll(req, res) {
        try {
            const requests = await Swap.getAllRequests();
            res.json({
                success: true,
                data: requests
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Approve swap
    static async approve(req, res) {
        try {
            const { requestId } = req.body;
            
            if (!requestId) {
                return res.status(400).json({
                    success: false,
                    error: 'Request ID required'
                });
            }
            
            await Swap.approveRequest(requestId);
            res.json({
                success: true,
                message: 'Swap approved and dates updated!'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Reject swap
    static async reject(req, res) {
        try {
            const { requestId } = req.body;
            
            if (!requestId) {
                return res.status(400).json({
                    success: false,
                    error: 'Request ID required'
                });
            }
            
            await Swap.rejectRequest(requestId);
            res.json({
                success: true,
                message: 'Swap request rejected'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Cancel swap (by creator)
    static async cancel(req, res) {
        try {
            const { requestId } = req.body;
            const userId = req.session.userId;
            
            if (!requestId) {
                return res.status(400).json({
                    success: false,
                    error: 'Request ID required'
                });
            }
            
            await Swap.cancelRequest(requestId, userId);
            res.json({
                success: true,
                message: 'Swap request cancelled'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Get swap history
    static async getHistory(req, res) {
        try {
            const userId = req.session.userId;
            const history = await Swap.getHistory(userId);
            res.json({
                success: true,
                data: history
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = SwapController;