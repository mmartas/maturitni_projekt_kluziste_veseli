// kontrola jestli je uživatel přihlášený
function requireAuth(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    res.redirect('/login.html');
}

module.exports = { requireAuth };