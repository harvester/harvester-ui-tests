import { LoginPage } from "@/pageobjects/login.po";
import Dashboard from "@/pageobjects/dashboard.po";
import { Constants } from "@/constants/constants";

const constants = new Constants();
/**
 * This is the login spec
 * 1. Login for first time
 * 2. Login with already set password
 */
describe('Harvester login page', () => {
    it("Invalid Login", () => {
        const page = new LoginPage();

        page.visit();
        page.inputUsername("admin");
        page.inputPassword("the Invalid Password");

        page.loginBtn.click();
        page.Message({iserror:true}).should("be.visible")

    })

    it('Should login successfully', () => {
        const login = new LoginPage();
        login.login();
    });

    it("Logout from valid login", () => {
        const page = new LoginPage();
        page.visit()
        page.inputUsername()
        page.inputPassword()

        page.loginBtn.click()
        page.validateLogin();

        Dashboard.header.logout();
        page.Message({iserror:false}).should("be.visible")
    })

    // https://harvester.github.io/tests/manual/authentication/logout-then-login/
    it("Logout from the UI and login again", () => {
        const page = new LoginPage();
        page.visit();
        page.inputUsername();
        page.inputPassword();

        page.loginBtn.click();
        page.validateLogin();

        Dashboard.header.logout();
        page.inputUsername();
        page.inputPassword();
        page.loginBtn.click();
        page.validateLogin();
    })
});

/**
 * https://harvester.github.io/tests/manual/authentication/1409-change-password/
 */
describe('Account & API Keys page', () => {
    it("Change user password", () => {
        const page = new LoginPage();

        // change password
        page.login();
        page.changePassword({
            currentPassword: constants.password,
            newPassword: constants.mockPassword
        });

        // original password can not login.
        Dashboard.header.logout();
        page.inputUsername();
        page.inputPassword();
        page.loginBtn.click();
        page.Message({iserror:true}).should("be.visible");

        // change password
        page.login(constants.username, constants.mockPassword);
        page.changePassword({
            currentPassword: constants.mockPassword,
            newPassword: constants.password
        });

        // original password can login.
        Dashboard.header.logout();
        page.login();
    })
});
