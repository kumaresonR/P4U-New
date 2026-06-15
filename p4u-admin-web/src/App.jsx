import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRouteLayout from "./components/ProtectedRouteLayout";
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




//  VENDOR

import EditVendorPage from './pages/vendor/EditVendorPage';
import ProductVendorsPage from './pages/vendor/ProductVendorsPage';
import ServiceVendorsPage from './pages/vendor/ServiceVendorsPage';


// PRODUCT
import ProductListPage from './pages/product/ProductListPage';
import ProductAttributesListPage from './pages/product-attributes/ProductAttributesListPage';

// CATEGORY
import CategoryListPage from './pages/category/CategoryListPage';
import ProductCategoryListPage from './pages/category/ProductCategoryListPage';
import SubcategoryListPage from './pages/subcategory/SubcategoryListPage';

// SERVICE
import ServiceListPage from './pages/service/ServiceListPage';

// CUSTOMER
import CustomerListPage from './pages/customer/CustomerListPage';

import PlatformVariablesListPage from './pages/platformvariable/PlatformVariablesListPage';

import CouponListPage from './pages/coupon/CouponListPage';

import OccupationListPage from './pages/occupation/OccupationListPage';

// POINTS

import PointsListPage from './pages/points/PointsListPage';
// POINTS

import Login from './pages/auth/Login';


// ORDER IMPORTS
import OrderListPage from './pages/orders/OrderListPage';
import ServiceBookingListPage from './pages/bookings/ServiceBookingListPage';

// CF MODULES
import CFVendorsListPage from './pages/cf-vendor/CFVendorsListPage';
import CFCategoriesListPage from './pages/cf-category/CFCategoriesListPage';
import CFProductsListPage from './pages/cf-product/CFProductsListPage';
import CFServicesListPage from './pages/cf-service/CFServicesListPage';
import CFCityListPage from './pages/cf-city/CFCityListPage';

// SETTLEMENTS / TAX / MARKETING
import SettlementsPage from './pages/settlement/SettlementsPage';
import TaxListPage from './pages/tax/TaxListPage';
import BannerListPage from './pages/banner/BannerListPage';
import HomepageCmsPage from './pages/homepage-cms/HomepageCmsPage';
import PushNotificationsPage from './pages/push-notifications/PushNotificationsPage';
import MediaLibraryPage from './pages/media-library/MediaLibraryPage';
import FileUploadsPage from './pages/file-uploads/FileUploadsPage';
import PopupBannersListPage from './pages/popupbanner/PopupBannersListPage';
import AdvertisementsListPage from './pages/advertisement/AdvertisementsListPage';
import VendorPlansPage from './pages/vendor-plan/VendorPlansPage';
import VendorPortalPage from './pages/vendor-portal/VendorPortalPage';

// REPORT
import ReportLogPage from './pages/report/ReportLogPage';
import ReportsHubPage from './pages/reports/ReportsHubPage';
import SalesReportPage from './pages/reports/SalesReportPage';
import VendorPerformanceReportPage from './pages/reports/VendorPerformanceReportPage';
import SettlementReportPage from './pages/reports/SettlementReportPage';
import CustomerReportPage from './pages/reports/CustomerReportPage';
import PointsReportPage from './pages/reports/PointsReportPage';
import ClassifiedAdsReportPage from './pages/reports/ClassifiedAdsReportPage';
import ReferralReportPage from './pages/reports/ReferralReportPage';
import PaymentReportPage from './pages/reports/PaymentReportPage';
import RevenueProfitReportPage from './pages/reports/RevenueProfitReportPage';
import TaxInvoicesReportPage from './pages/reports/TaxInvoicesReportPage';
import TaxReportPage from './pages/reports/TaxReportPage';
import SocialDashboardPage from './pages/social/SocialDashboardPage';



function App() {
  return (
    <BrowserRouter>
      <RouteScrollToTop />
      <Routes> 
       <Route exact path='/' element={<Login />} /> 
  <Route exact path='/login' element={<Login />} />

  <Route element={<ProtectedRouteLayout />}>
  <Route exact path='/dashboard' element={<Dashboard />} /> 
        {/* VENDOR */}
        <Route exact path='/vendor' element={<Navigate to='/product-vendors' replace />} />
        <Route exact path='/product-vendors' element={<ProductVendorsPage />} />
        <Route exact path='/service-vendors' element={<ServiceVendorsPage />} />
        <Route exact path='/vendor-service-approvals' element={<Navigate to='/service?tab=approvals' replace />} />
        <Route exact path='/edit-vendor/:id' element={<EditVendorPage />} />
        <Route exact path='/vendor-portal' element={<VendorPortalPage />} />



        {/* PRODUCT */}
        <Route exact path='/product' element={<ProductListPage />} />
        <Route exact path='/product-attributes' element={<ProductAttributesListPage />} />

{/* CATEGORY — product vs service use separate tables */}
<Route exact path='/service-categories' element={<CategoryListPage />} />
<Route exact path='/product-categories' element={<ProductCategoryListPage />} />
<Route exact path='/category' element={<Navigate to='/service-categories' replace />} />
<Route exact path='/subcategories' element={<SubcategoryListPage />} />

{/* SERVICE */}
<Route exact path='/service' element={<ServiceListPage />} />

{/* CUSTOMER */}
<Route exact path='/customer' element={<CustomerListPage />} />
<Route exact path='/customers' element={<CustomerListPage />} />

{/* PLATFORM VARIABLES */}
<Route exact path='/platform-variables' element={<PlatformVariablesListPage />} />

{/* COUPONS */}
<Route exact path='/coupons' element={<CouponListPage />} />

{/* OCCUPATIONS */}
<Route exact path='/occupations' element={<OccupationListPage />} />

{/* POINTS */}
<Route exact path='/points' element={<PointsListPage />} />



{/* ORDERS */}
<Route exact path='/orders' element={<OrderListPage />} />
<Route exact path='/service-bookings' element={<ServiceBookingListPage />} />

{/* CF MODULES */}
<Route exact path='/cf-vendors' element={<CFVendorsListPage />} />
<Route exact path='/cf-categories' element={<CFCategoriesListPage />} />
<Route exact path='/cf-products' element={<CFProductsListPage />} />
<Route exact path='/cf-services' element={<CFServicesListPage />} />
<Route exact path='/cf-cities' element={<CFCityListPage />} />

{/* SETTLEMENTS */}
<Route exact path='/settlements' element={<SettlementsPage />} />

{/* TAX */}
<Route exact path='/tax' element={<TaxListPage />} />
<Route exact path='/vendor-plans' element={<VendorPlansPage />} />

{/* MARKETING */}
<Route exact path='/homepage-cms' element={<HomepageCmsPage />} />
<Route exact path='/notifications' element={<PushNotificationsPage />} />
<Route exact path='/media-library' element={<MediaLibraryPage />} />
<Route exact path='/file-uploads' element={<FileUploadsPage />} />
<Route exact path='/banners' element={<BannerListPage />} />
<Route exact path='/popup-banners' element={<PopupBannersListPage />} />
<Route exact path='/advertisements' element={<AdvertisementsListPage />} />

{/* REPORTS */}
<Route exact path='/reports' element={<ReportsHubPage />} />
        <Route exact path='/reports/sales' element={<SalesReportPage />} />
        <Route exact path='/reports/vendor-performance' element={<VendorPerformanceReportPage />} />
        <Route exact path='/reports/settlements' element={<SettlementReportPage />} />
        <Route exact path='/reports/customers' element={<CustomerReportPage />} />
        <Route exact path='/reports/points' element={<PointsReportPage />} />
        <Route exact path='/reports/classified-ads' element={<ClassifiedAdsReportPage />} />
        <Route exact path='/reports/referrals' element={<ReferralReportPage />} />
        <Route exact path='/reports/payments' element={<PaymentReportPage />} />
        <Route exact path='/reports/revenue-profit' element={<RevenueProfitReportPage />} />
        <Route exact path='/reports/tax-invoices' element={<TaxInvoicesReportPage />} />
        <Route exact path='/reports/tax' element={<TaxReportPage />} />
<Route exact path='/report-log' element={<ReportLogPage />} />
<Route exact path='/admin/social' element={<SocialDashboardPage />} />

    

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
        <Route
          exact
          path='/code-generator-new'
          element={<CodeGeneratorNewPage />}
        />
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
        <Route
          exact
          path='/marketplace-details'
          element={<MarketplaceDetailsPage />}
        />
        <Route exact path='/marketplace' element={<MarketplacePage />} />
        <Route
          exact
          path='/notification-alert'
          element={<NotificationAlertPage />}
        />
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
        <Route
          exact
          path='/text-generator-new'
          element={<TextGeneratorNewPage />}
        />
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

  </Route>

        <Route exact path='*' element={<ErrorPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
