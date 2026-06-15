const fs = require('fs');
const file = 'c:\\\\Users\\\\PC1\\\\Desktop\\\\ecomm-main\\\\admin\\\\src\\\\pages\\\\Finances.jsx';
let content = fs.readFileSync(file, 'utf8');

const gridStart = content.indexOf('<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">');
const tableStart = content.indexOf('<div className="bg-white rounded-2xl border shadow-sm overflow-hidden">', gridStart);
const tabEnd = content.indexOf('</div>\r\n      )}\r\n\r\n      {activeTab === \'INVENTARIO\'', tableStart) !== -1 ? 
    content.indexOf('</div>\r\n      )}\r\n\r\n      {activeTab === \'INVENTARIO\'', tableStart) : 
    content.indexOf('</div>\n      )}\n\n      {activeTab === \'INVENTARIO\'', tableStart);

if (gridStart !== -1 && tableStart !== -1 && tabEnd !== -1) {
  const gridBlock = content.substring(gridStart, tableStart);
  const tableBlock = content.substring(tableStart, tabEnd);
  
  const newContent = content.substring(0, gridStart) + tableBlock + '\n\n          ' + gridBlock.trim() + '\n        ' + content.substring(tabEnd);
  fs.writeFileSync(file, newContent);
  console.log('Swapped successfully!');
} else {
  console.log('Could not find boundaries: ', gridStart, tableStart, tabEnd);
}
