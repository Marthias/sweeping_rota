class NavigationManager {

    constructor() {
        this.currentPage = "home";
    }

    init() {
        console.log("✅ Navigation Manager Ready");
    }

    show(pageName) {
        console.log("Navigate to:", pageName);

        this.currentPage = pageName;
    }

}

window.navigationManager = new NavigationManager();