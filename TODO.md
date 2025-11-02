# TODO: Replace HTML Table with Ant Design Table in roomManager

## Steps to Complete:
1. **Import Ant Design Table**: Add import for Table component in roomManager.js.
2. **Define Table Columns**: Create a columns array with render functions for ID phòng, Loại phòng, Thành viên, Ngày tạo, Hành động.
3. **Replace HTML Table**: Substitute the existing <table> JSX with <Table /> component, using dataSource and columns.
4. **Add Pagination**: Set pagination={{ pageSize: 10 }} on the Table.
5. **Update SCSS**: Modify roomManager.scss to style Ant Design Table classes (.ant-table, .ant-table-thead, etc.) to match existing colors and interface, including dark theme support.
6. **Test and Verify**: Ensure the table renders correctly, pagination works, and styles match the original design.
