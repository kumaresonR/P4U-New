import { BrowserRouter, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/dashboard/DashoardLayout";
import HomePageTwo from "./pages/HomePageTwo";
import HomePageThree from "./pages/HomePageThree";
import HomePageFour from "./pages/HomePageFour";
import HomePageFive from "./pages/HomePageFive";
import HomePageSix from "./pages/HomePageSix";
import HomePageSeven from "./pages/HomePageSeven";
import EmailPage from "./pages/EmailPage";
import AddUserPage from "./pages/AddUserPage";
import AlertPage from "./pages/AlertPage";
import AssignRolePage from "./pages/AssignRolePage";
import AvatarPage from "./pages/AvatarPage";
import BadgesPage from "./pages/BadgesPage";
import ButtonPage from "./pages/ButtonPage";
import CalendarMainPage from "./pages/CalendarMainPage";
import CardPage from "./pages/CardPage";
import CarouselPage from "./pages/CarouselPage";
import ChatMessagePage from "./pages/ChatMessagePage";
import ChatProfilePage from "./pages/ChatProfilePage";
import CodeGeneratorNewPage from "./pages/CodeGeneratorNewPage";
import CodeGeneratorPage from "./pages/CodeGeneratorPage";
import ColorsPage from "./pages/ColorsPage";
import ColumnChartPage from "./pages/ColumnChartPage";
import CompanyPage from "./pages/CompanyPage";
import CurrenciesPage from "./pages/CurrenciesPage";
import DropdownPage from "./pages/DropdownPage";
import ErrorPage from "./pages/ErrorPage";
import FaqPage from "./pages/FaqPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import FormLayoutPage from "./pages/FormLayoutPage";
import FormValidationPage from "./pages/FormValidationPage";
import FormPage from "./pages/FormPage";
import GalleryPage from "./pages/GalleryPage";
import ImageGeneratorPage from "./pages/ImageGeneratorPage";
import ImageUploadPage from "./pages/ImageUploadPage";
import InvoiceAddPage from "./pages/InvoiceAddPage";
import InvoiceEditPage from "./pages/InvoiceEditPage";
import InvoiceListPage from "./pages/InvoiceListPage";
import InvoicePreviewPage from "./pages/InvoicePreviewPage";
import KanbanPage from "./pages/KanbanPage";
import LanguagePage from "./pages/LanguagePage";
import LineChartPage from "./pages/LineChartPage";
import ListPage from "./pages/ListPage";
import MarketplaceDetailsPage from "./pages/MarketplaceDetailsPage";
import MarketplacePage from "./pages/MarketplacePage";
import NotificationAlertPage from "./pages/NotificationAlertPage";
import NotificationPage from "./pages/NotificationPage";
import PaginationPage from "./pages/PaginationPage";
import PaymentGatewayPage from "./pages/PaymentGatewayPage";
import PieChartPage from "./pages/PieChartPage";
import PortfolioPage from "./pages/PortfolioPage";
import PricingPage from "./pages/PricingPage";
import ProgressPage from "./pages/ProgressPage";
import RadioPage from "./pages/RadioPage";
import RoleAccessPage from "./pages/RoleAccessPage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import StarRatingPage from "./pages/StarRatingPage";
import StarredPage from "./pages/StarredPage";
import SwitchPage from "./pages/SwitchPage";
import TableBasicPage from "./pages/TableBasicPage";
import TableDataPage from "./pages/TableDataPage";
import TabsPage from "./pages/TabsPage";
import TagsPage from "./pages/TagsPage";
import TermsConditionPage from "./pages/TermsConditionPage";
import TextGeneratorPage from "./pages/TextGeneratorPage";
import ThemePage from "./pages/ThemePage";
import TooltipPage from "./pages/TooltipPage";
import TypographyPage from "./pages/TypographyPage";
import UsersGridPage from "./pages/UsersGridPage";
import UsersListPage from "./pages/UsersListPage";
import ViewDetailsPage from "./pages/ViewDetailsPage";
import VideoGeneratorPage from "./pages/VideoGeneratorPage";
import VideosPage from "./pages/VideosPage";
import ViewProfilePage from "./pages/ViewProfilePage";
import VoiceGeneratorPage from "./pages/VoiceGeneratorPage";
import WalletPage from "./pages/WalletPage";
import WidgetsPage from "./pages/WidgetsPage";
import WizardPage from "./pages/WizardPage";
import RouteScrollToTop from "./helper/RouteScrollToTop";
import TextGeneratorNewPage from "./pages/TextGeneratorNewPage";
import HomePageEight from "./pages/HomePageEight";
import HomePageNine from "./pages/HomePageNine";
import HomePageTen from "./pages/HomePageTen";
import HomePageEleven from "./pages/HomePageEleven";
import GalleryGridPage from "./pages/GalleryGridPage";
import GalleryMasonryPage from "./pages/GalleryMasonryPage";
import GalleryHoverPage from "./pages/GalleryHoverPage";
import BlogPage from "./pages/BlogPage";
import BlogDetailsPage from "./pages/BlogDetailsPage";
import AddBlogPage from "./pages/AddBlogPage";
import TestimonialsPage from "./pages/TestimonialsPage";
import ComingSoonPage from "./pages/ComingSoonPage";
import AccessDeniedPage from "./pages/AccessDeniedPage";
import MaintenancePage from "./pages/MaintenancePage";
import BlankPagePage from "./pages/BlankPagePage";

// AUTH
import Login from './pages/auth/Login';

// VENDOR
import Vendorpage from './pages/vendor/VendorPage'
import AddVendor from './pages/vendor/AddVendor'
import EditVendorPage from './pages/vendor/EditVendorPage';
import ViewVendorPage from './pages/vendor/ViewVendorPage';

// PRODUCT
import ProductListPage from './pages/product/ProductListPage';
import AddProduct from './pages/product/AddProduct';
import EditProductPage from './pages/product/EditProductPage';
import ViewProductPage from './pages/product/ViewProductPage';

// CATEGORY
import CategoryListPage from './pages/category/CategoryListPage';
import AddCategory from './pages/category/AddCategory';
import EditCategoryPage from './pages/category/EditCategoryPage';
import ViewCategoryPage from './pages/category/ViewCategoryPage';

// SERVICE
import ServiceListPage from './pages/service/ServiceListPage';
import AddService from './pages/service/AddService';
import EditServicePage from './pages/service/EditServicePage';
import ViewServicePage from './pages/service/ViewServicePage';

// CUSTOMER
import CustomerListPage from './pages/customer/CustomerListPage';
import EditCustomerPage from './pages/customer/EditCustomerPage';
import ViewCustomerPage from './pages/customer/ViewCustomerPage';

// POINTS
import PointsListPage from './pages/points/PointsListPage';

// ORDERS
import OrderListPage from './pages/orders/OrderListPage';
import EditOrderPage from './pages/orders/EditOrderPage';
import ViewOrderPage from './pages/orders/ViewOrderPage';

// SETTLEMENTS
import ListCashPage from './pages/settlement/ListCashPage';
import ListPointsPage from './pages/settlement/ListPointsPage';
import ViewSettlementPage from './pages/settlement/ViewSettlementPage';

// TAX
import TaxListPage from './pages/tax/TaxListPage';
import AddTaxPage from './pages/tax/AddTaxPage';
import EditTaxPage from './pages/tax/EditTaxPage';

// REPORT LOG
import ReportLogPage from './pages/report/ReportLogPage';

// BANNERS
import BannerListPage from './pages/banner/BannerListPage';
import AddBannerPage from './pages/banner/AddBannerPage';
import EditBannerPage from './pages/banner/EditBannerPage';
import ViewBannerPage from './pages/banner/ViewBannerPage';

// ADVERTISEMENTS
import AdvertisementsListPage from './pages/advertisement/AdvertisementsListPage';
import AddAdvertisementPage from './pages/advertisement/AddAdvertisementPage';
import EditAdvertisementPage from './pages/advertisement/EditAdvertisementPage';
import ViewAdvertisementPage from './pages/advertisement/ViewAdvertisementPage';

// PLATFORM VARIABLES
import PlatformVariablesListPage from './pages/platformvariable/PlatformVariablesListPage';
import AddPlatformVariablePage from './pages/platformvariable/AddPlatformVariablePage';
import EditPlatformVariablePage from './pages/platformvariable/EditPlatformVariablePage';
import ViewPlatformVariablePage from './pages/platformvariable/ViewPlatformVariablePage';


// ==========================================
// 🚀 THE NEWLY ADDED MISSING IMPORTS BELOW
// ==========================================

// CF CITY
import CFCityListPage from './pages/cf-city/CFCityListPage';
import AddCFCityPage from './pages/cf-city/AddCFCityPage';
import EditCFCityPage from './pages/cf-city/EditCFCityPage';
import ViewCFCityPage from './pages/cf-city/ViewCFCityPage';

// CF CATEGORY
import CFCategoryListPage from './pages/cf-category/CFCategoriesListPage';
import AddCFCategoryPage from './pages/cf-category/AddCFCategoryPage';
import EditCFCategoryPage from './pages/cf-category/EditCFCategoryPage';
import ViewCFCategoryPage from './pages/cf-category/ViewCFCategoryPage';

// CF SERVICE
import CFServiceListPage from './pages/cf-service/CFServicesListPage';
import AddCFServicePage from './pages/cf-service/AddCFServicePage';
import EditCFServicePage from './pages/cf-service/EditCFServicePage';
import ViewCFServicePage from './pages/cf-service/ViewCFServicePage';

// CF VENDOR & ENQUIRY
import CFVendorsListPage from './pages/cf-vendor/CFVendorsListPage';
import AddCFVendorPage from './pages/cf-vendor/AddCFVendorPage';
import EditCFVendorPage from './pages/cf-vendor/EditCFVendorPage';
import ViewCFVendorPage from './pages/cf-vendor/ViewCFVendorPage';
import VendorEnquiryListPage from './pages/cf-vendor/VendorEnquiryListPage';

// OCCUPATIONS
import OccupationsListPage from './pages/occupation/OccupationsListPage';
import AddOccupationPage from './pages/occupation/AddOccupationPage';
import EditOccupationPage from './pages/occupation/EditOccupationPage';
import ViewOccupationPage from './pages/occupation/ViewOccupationPage';

// POPUP BANNERS
import PopupBannersListPage from './pages/popupbanner/PopupBannersListPage';
import AddPopupBannerPage from './pages/popupbanner/AddPopupBannerPage';
import EditPopupBannerPage from './pages/popupbanner/EditPopupBannerPage';
import ViewPopupBannerPage from './pages/popupbanner/ViewPopupBannerPage';


function App() {
  return (
    <BrowserRouter>
      <RouteScrollToTop />
      <Routes> 
        <Route exact path='/' element={<Login />} /> 
        <Route exact path='/dashboard' element={<Dashboard />} /> 
        <Route exact path='/login' element={<Login />} />
        
        {/* VENDOR */} 
        <Route exact path='/vendor' element={<Vendorpage />} />
        <Route exact path='/add-vendor' element={<AddVendor />} />
        <Route exact path='/edit-vendor/:id' element={<EditVendorPage />} />
        <Route exact path='/view-vendor/:id' element={<ViewVendorPage />} />

        {/* PRODUCT */}
        <Route exact path='/product' element={<ProductListPage />} />
        <Route exact path='/add-product' element={<AddProduct />} />
        <Route exact path='/edit-product/:id' element={<EditProductPage />} />
        <Route exact path='/view-product/:id' element={<ViewProductPage />} />

        {/* CATEGORY */}
        <Route exact path='/category' element={<CategoryListPage />} />
        <Route exact path='/add-category' element={<AddCategory />} />
        <Route exact path='/edit-category/:id' element={<EditCategoryPage />} />
        <Route exact path='/view-category/:id' element={<ViewCategoryPage />} />

        {/* SERVICE */}
        <Route exact path='/service' element={<ServiceListPage />} />
        <Route exact path='/add-service' element={<AddService />} />
        <Route exact path='/edit-service/:id' element={<EditServicePage />} />
        <Route exact path='/view-service/:id' element={<ViewServicePage />} />

        {/* CUSTOMER */}
        <Route exact path='/customer' element={<CustomerListPage />} />
        <Route exact path='/edit-customer/:id' element={<EditCustomerPage />} />
        <Route exact path='/view-customer/:id' element={<ViewCustomerPage />} />

        {/* POINTS */}
        <Route exact path='/points' element={<PointsListPage />} />

        {/* ORDERS */}
        <Route exact path='/orders' element={<OrderListPage />} />
        <Route exact path='/edit-order/:id' element={<EditOrderPage />} />
        <Route exact path='/view-order/:id' element={<ViewOrderPage />} />

        {/* SETTLEMENTS */}
        <Route exact path='/list-cash' element={<ListCashPage />} />
        <Route exact path='/list-points' element={<ListPointsPage />} />
        <Route exact path='/view-settlement/:id' element={<ViewSettlementPage />} />

        {/* TAX */}
        <Route exact path='/tax' element={<TaxListPage />} />
        <Route exact path='/add-tax' element={<AddTaxPage />} />
        <Route exact path='/edit-tax/:id' element={<EditTaxPage />} />

        {/* REPORTS */}
        <Route exact path='/report-log' element={<ReportLogPage />} />

        {/* BANNERS */}
        <Route exact path='/banners' element={<BannerListPage />} />
        <Route exact path='/add-banner' element={<AddBannerPage />} />
        <Route exact path='/edit-banner/:id' element={<EditBannerPage />} />
        <Route exact path='/view-banner/:id' element={<ViewBannerPage />} />

        {/* ADVERTISEMENTS */}
        <Route exact path='/advertisements' element={<AdvertisementsListPage />} />
        <Route exact path='/add-advertisement' element={<AddAdvertisementPage />} />
        <Route exact path='/edit-advertisement/:id' element={<EditAdvertisementPage />} />
        <Route exact path='/view-advertisement/:id' element={<ViewAdvertisementPage />} />

        {/* PLATFORM VARIABLES */}
        <Route exact path='/platform-variables' element={<PlatformVariablesListPage />} />
        <Route exact path='/add-platform-variable' element={<AddPlatformVariablePage />} />
        <Route exact path='/edit-platform-variable/:id' element={<EditPlatformVariablePage />} />
        <Route exact path='/view-platform-variable/:id' element={<ViewPlatformVariablePage />} />

        {/* ========================================== */}
        {/* 🚀 THE NEWLY ADDED MISSING ROUTES BELOW    */}
        {/* ========================================== */}

        {/* CF CITY */}
        <Route exact path='/cf-cities' element={<CFCityListPage />} />
        <Route exact path='/add-cf-city' element={<AddCFCityPage />} />
        <Route exact path='/edit-cf-city/:id' element={<EditCFCityPage />} />
        <Route exact path='/view-cf-city/:id' element={<ViewCFCityPage />} />

        {/* CF CATEGORY */}
        <Route exact path='/cf-categories' element={<CFCategoryListPage />} />
        <Route exact path='/add-cf-category' element={<AddCFCategoryPage />} />
        <Route exact path='/edit-cf-category/:id' element={<EditCFCategoryPage />} />
        <Route exact path='/view-cf-category/:id' element={<ViewCFCategoryPage />} />

        {/* CF SERVICE */}
        <Route exact path='/cf-services' element={<CFServiceListPage />} />
        <Route exact path='/add-cf-service' element={<AddCFServicePage />} />
        <Route exact path='/edit-cf-service/:id' element={<EditCFServicePage />} />
        <Route exact path='/view-cf-service/:id' element={<ViewCFServicePage />} />

        {/* CF VENDORS & ENQUIRIES */}
        <Route exact path='/cf-vendors' element={<CFVendorsListPage />} />
        <Route exact path='/add-cf-vendor' element={<AddCFVendorPage />} />
        <Route exact path='/edit-cf-vendor/:id' element={<EditCFVendorPage />} />
        <Route exact path='/view-cf-vendor/:id' element={<ViewCFVendorPage />} />
        <Route exact path='/vendor-enquiry' element={<VendorEnquiryListPage />} />

        {/* OCCUPATIONS */}
        <Route exact path='/occupations' element={<OccupationsListPage />} />
        <Route exact path='/add-occupation' element={<AddOccupationPage />} />
        <Route exact path='/edit-occupation/:id' element={<EditOccupationPage />} />
        <Route exact path='/view-occupation/:id' element={<ViewOccupationPage />} />

        {/* POPUP BANNERS */}
        <Route exact path='/popup-banners' element={<PopupBannersListPage />} />
        <Route exact path='/add-popup-banner' element={<AddPopupBannerPage />} />
        <Route exact path='/edit-popup-banner/:id' element={<EditPopupBannerPage />} />
        <Route exact path='/view-popup-banner/:id' element={<ViewPopupBannerPage />} />


        {/* THEME / DEMO TEMPLATE ROUTES */}
        <Route exact path='/dashboard-2' element={<HomePageTwo />} />
        <Route exact path='/dashboard-3' element={<HomePageThree />} />
        <Route exact path='/dashboard-4' element={<HomePageFour />} />
        <Route exact path='/dashboard-5' element={<HomePageFive />} />
        <Route exact path='/dashboard-6' element={<HomePageSix />} />
        <Route exact path='/dashboard-7' element={<HomePageSeven />} />
        <Route exact path='/dashboard-8' element={<HomePageEight />} />
        <Route exact path='/dashboard-9' element={<HomePageNine />} />
        <Route exact path='/dashboard-10' element={<HomePageTen />} />
        <Route exact path='/dashboard-11' element={<HomePageEleven />} />

        {/* SL */}
        <Route exact path='/add-user' element={<AddUserPage />} />
        <Route exact path='/alert' element={<AlertPage />} />
        <Route exact path='/assign-role' element={<AssignRolePage />} />
        <Route exact path='/avatar' element={<AvatarPage />} />
        <Route exact path='/badges' element={<BadgesPage />} />
        <Route exact path='/button' element={<ButtonPage />} />
        <Route exact path='/calendar-main' element={<CalendarMainPage />} />
        <Route exact path='/calendar' element={<CalendarMainPage />} />
        <Route exact path='/card' element={<CardPage />} />
        <Route exact path='/carousel' element={<CarouselPage />} />
        <Route exact path='/chat-message' element={<ChatMessagePage />} />
        <Route exact path='/chat-profile' element={<ChatProfilePage />} />
        <Route exact path='/code-generator' element={<CodeGeneratorPage />} />
        <Route exact path='/code-generator-new' element={<CodeGeneratorNewPage />} />
        <Route exact path='/colors' element={<ColorsPage />} />
        <Route exact path='/column-chart' element={<ColumnChartPage />} />
        <Route exact path='/company' element={<CompanyPage />} />
        <Route exact path='/currencies' element={<CurrenciesPage />} />
        <Route exact path='/dropdown' element={<DropdownPage />} />
        <Route exact path='/email' element={<EmailPage />} />
        <Route exact path='/faq' element={<FaqPage />} />
        <Route exact path='/forgot-password' element={<ForgotPasswordPage />} />
        <Route exact path='/form-layout' element={<FormLayoutPage />} />
        <Route exact path='/form-validation' element={<FormValidationPage />} />
        <Route exact path='/form' element={<FormPage />} />
        <Route exact path='/gallery' element={<GalleryPage />} />
        <Route exact path='/gallery-grid' element={<GalleryGridPage />} />
        <Route exact path='/gallery-masonry' element={<GalleryMasonryPage />} />
        <Route exact path='/gallery-hover' element={<GalleryHoverPage />} />
        <Route exact path='/blog' element={<BlogPage />} />
        <Route exact path='/blog-details' element={<BlogDetailsPage />} />
        <Route exact path='/add-blog' element={<AddBlogPage />} />
        <Route exact path='/testimonials' element={<TestimonialsPage />} />
        <Route exact path='/coming-soon' element={<ComingSoonPage />} />
        <Route exact path='/access-denied' element={<AccessDeniedPage />} />
        <Route exact path='/maintenance' element={<MaintenancePage />} />
        <Route exact path='/blank-page' element={<BlankPagePage />} />
        <Route exact path='/image-generator' element={<ImageGeneratorPage />} />
        <Route exact path='/image-upload' element={<ImageUploadPage />} />
        <Route exact path='/invoice-add' element={<InvoiceAddPage />} />
        <Route exact path='/invoice-edit' element={<InvoiceEditPage />} />
        <Route exact path='/invoice-list' element={<InvoiceListPage />} />
        <Route exact path='/invoice-preview' element={<InvoicePreviewPage />} />
        <Route exact path='/kanban' element={<KanbanPage />} />
        <Route exact path='/language' element={<LanguagePage />} />
        <Route exact path='/line-chart' element={<LineChartPage />} />
        <Route exact path='/list' element={<ListPage />} />
        <Route exact path='/marketplace-details' element={<MarketplaceDetailsPage />} />
        <Route exact path='/marketplace' element={<MarketplacePage />} />
        <Route exact path='/notification-alert' element={<NotificationAlertPage />} />
        <Route exact path='/notification' element={<NotificationPage />} />
        <Route exact path='/pagination' element={<PaginationPage />} />
        <Route exact path='/payment-gateway' element={<PaymentGatewayPage />} />
        <Route exact path='/pie-chart' element={<PieChartPage />} />
        <Route exact path='/portfolio' element={<PortfolioPage />} />
        <Route exact path='/pricing' element={<PricingPage />} />
        <Route exact path='/progress' element={<ProgressPage />} />
        <Route exact path='/radio' element={<RadioPage />} />
        <Route exact path='/role-access' element={<RoleAccessPage />} />
        <Route exact path='/sign-in' element={<SignInPage />} />
        <Route exact path='/sign-up' element={<SignUpPage />} />
        <Route exact path='/star-rating' element={<StarRatingPage />} />
        <Route exact path='/starred' element={<StarredPage />} />
        <Route exact path='/switch' element={<SwitchPage />} />
        <Route exact path='/table-basic' element={<TableBasicPage />} />
        <Route exact path='/table-data' element={<TableDataPage />} />
        <Route exact path='/tabs' element={<TabsPage />} />
        <Route exact path='/tags' element={<TagsPage />} />
        <Route exact path='/terms-condition' element={<TermsConditionPage />} />
        <Route exact path='/text-generator-new' element={<TextGeneratorNewPage />} />
        <Route exact path='/text-generator' element={<TextGeneratorPage />} />
        <Route exact path='/theme' element={<ThemePage />} />
        <Route exact path='/tooltip' element={<TooltipPage />} />
        <Route exact path='/typography' element={<TypographyPage />} />
        <Route exact path='/users-grid' element={<UsersGridPage />} />
        <Route exact path='/users-list' element={<UsersListPage />} />
        <Route exact path='/view-details' element={<ViewDetailsPage />} />
        <Route exact path='/video-generator' element={<VideoGeneratorPage />} />
        <Route exact path='/videos' element={<VideosPage />} />
        <Route exact path='/view-profile' element={<ViewProfilePage />} />
        <Route exact path='/voice-generator' element={<VoiceGeneratorPage />} />
        <Route exact path='/wallet' element={<WalletPage />} />
        <Route exact path='/widgets' element={<WidgetsPage />} />
        <Route exact path='/wizard' element={<WizardPage />} />

        {/* 404 Fallback */}
        <Route exact path='*' element={<ErrorPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;