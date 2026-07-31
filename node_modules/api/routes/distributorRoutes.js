const express = require('express');
const router = express.Router();
const { getDistributors, addDistributor, updateDistributor, deleteDistributor, bulkUploadDistributors } = require('../controllers/distributorController');

router.get('/', getDistributors);
router.post('/bulk', bulkUploadDistributors);
router.post('/', addDistributor);
router.put('/:id', updateDistributor);
router.delete('/:id', deleteDistributor);

module.exports = router;
