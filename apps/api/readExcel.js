const xlsx = require('xlsx');

const workbook = xlsx.readFile('d:\\cashmitra\\DMS\\etc files\\Bill.xlsx');
const sheet_name_list = workbook.SheetNames;
const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
console.log(data.slice(0, 5));
