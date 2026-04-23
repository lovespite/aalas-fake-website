app.filter("future", function () {
    return function (items) {
        return items = items.filter(function (item) {
            var today = new Date();
            var dte = new Date(item.dateActive);
            return dte > today;
        })
    }
});
app.filter("past", function () {
    return function (items) {
        return items = items.filter(function (item) {
            var today = new Date();
            var dte = new Date(item.dateExpiration);
            return dte < today;
        })
    }
});
app.filter("current", function () {
    return function (items) {
        return items = items.filter(function (item) {
            var today = new Date();
            var dteActive = new Date(item.dateActive);
            var dteExpire = new Date(item.dateExpiration);
            return (dteActive <= today) && (dteExpire > today);
        })
    }
});