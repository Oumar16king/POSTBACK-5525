(function() {
    // Désactiver le clic droit
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });

    // Désactiver les raccourcis clavier d'inspection
    document.addEventListener('keydown', function(e) {
        // F12
        if (e.keyCode === 123) {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
        if (e.ctrlKey && (e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67) || e.keyCode === 85)) {
            e.preventDefault();
            return false;
        }
        // Meta (Mac) + Option + I/J/C/U
        if (e.metaKey && e.altKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67 || e.keyCode === 85)) {
            e.preventDefault();
            return false;
        }
    });

    // Détection de l'ouverture de la console (basique)
    var threshold = 160;
    var check = function() {
        if (window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold) {
            // Optionnel: rediriger ou vider la page si la console est ouverte
            // console.clear();
        }
    };
    window.addEventListener('resize', check);
    setInterval(check, 1000);
})();
