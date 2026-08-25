const authorizeRole = (...allowedRoles) => { // ...allowedRoles la mang cac vai tro duoc phep truy cap
    return (req, res, next) => {
        if (!allowedRoles.includes(req.user.role)) { // kiem tra xem vai tro cua nguoi dung co nam trong danh sach cac vai tro duoc phep truy cap k
            return res.status(403).json({
                success: false,
                message: "Bạn không có quyền thực hiện thao tác này",
            });
        }

        next();
    };
};

export default authorizeRole;
