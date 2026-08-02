const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getDistributors, getFile, addDistributor, updateDistributor, deleteDistributor, bulkUploadDistributors } = require('../controllers/distributorController');

const upload = multer({ storage: multer.memoryStorage() });

router.get('/', getDistributors);
router.get('/:id/file/:type', getFile);
router.post('/bulk', bulkUploadDistributors);
router.post('/', upload.fields([{ name: 'panFile', maxCount: 1 }, { name: 'aadharFile', maxCount: 1 }, { name: 'photoFile', maxCount: 1 }]), addDistributor);
router.put('/:id', upload.fields([{ name: 'panFile', maxCount: 1 }, { name: 'aadharFile', maxCount: 1 }, { name: 'photoFile', maxCount: 1 }]), updateDistributor);
router.delete('/:id', deleteDistributor);

module.exports = router;
