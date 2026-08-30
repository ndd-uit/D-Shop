import { lazy, Suspense } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "sonner"
import DocumentTitle from "./components/common/DocumentTitle"
import RoleRoute from "./components/auth/RoleRoute"

const CustomerLayout = lazy(() => import("./pages/CustomerLayout"))
const HomePage = lazy(() => import("./pages/HomePage"))
const GarmentListPage = lazy(() => import("./pages/GarmentListPage"))
const CategoriesPage = lazy(() => import("./pages/CategoriesPage"))
const GarmentDetailPage = lazy(() => import("./pages/GarmentDetailPage"))
const CartPage = lazy(() => import("./pages/CartPage"))
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"))
const MyRentalOrdersPage = lazy(() => import("./pages/MyRentalOrdersPage"))
const RentalOrderDetailPage = lazy(() => import("./pages/RentalOrderDetailPage"))
const ProfilePage = lazy(() => import("./pages/ProfilePage"))
const RegisterPage = lazy(() => import("./pages/RegisterPage"))
const LoginPage = lazy(() => import("./pages/LoginPage"))
const ManagerDashboardPage = lazy(() => import("./pages/ManagerDashboardPage"))
const ManagerGarmentsPage = lazy(() => import("./pages/ManagerGarmentsPage"))
const ManagerCategoriesPage = lazy(() => import("./pages/ManagerCategoriesPage"))
const ManagerRentalUnitsPage = lazy(() => import("./pages/ManagerRentalUnitsPage"))
const ManagerStaffPage = lazy(() => import("./pages/ManagerStaffPage"))
const ManagerFeeApprovalsPage = lazy(() => import("./pages/ManagerFeeApprovalsPage"))
const ManagerPoliciesPage = lazy(() => import("./pages/ManagerPoliciesPage"))
const OperationsRentalOrdersPage = lazy(() => import("./pages/OperationsRentalOrdersPage"))
const OperationsRentalOrderDetailPage = lazy(() => import("./pages/OperationsRentalOrderDetailPage"))
const AvailabilityBlocksPage = lazy(() => import("./pages/AvailabilityBlocksPage"))
const ManagerRefundsPage = lazy(() => import("./pages/ManagerRefundsPage"))

const MANAGER_ROLES = ["STORE_MANAGER"]
const STAFF_ROLES = ["RENTAL_STAFF"]
const CUSTOMER_ROLES = ["CUSTOMER"]
const AUTHENTICATED_ROLES = ["CUSTOMER", "RENTAL_STAFF", "STORE_MANAGER"]

function App() {
  return (
    <>
      <DocumentTitle />
      <Toaster position="top-right" richColors closeButton />
      <Suspense fallback={<div className="min-h-[100dvh] animate-pulse bg-brand-bg" />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<RoleRoute roles={MANAGER_ROLES} />}>
          <Route path="/manager" element={<ManagerDashboardPage />} />
          <Route path="/manager/garments" element={<ManagerGarmentsPage />} />
          <Route path="/manager/categories" element={<ManagerCategoriesPage />} />
          <Route path="/manager/inventory" element={<ManagerRentalUnitsPage />} />
          <Route path="/manager/staff" element={<ManagerStaffPage />} />
          <Route path="/manager/approvals" element={<ManagerFeeApprovalsPage />} />
          <Route path="/manager/policies" element={<ManagerPoliciesPage />} />
          <Route path="/manager/refunds" element={<ManagerRefundsPage />} />
          <Route path="/manager/reports" element={<Navigate to="/manager" replace />} />
          <Route path="/manager/availability-blocks" element={<AvailabilityBlocksPage />} />
          <Route path="/manager/rentals" element={<OperationsRentalOrdersPage />} />
          <Route path="/manager/rentals/:id" element={<OperationsRentalOrderDetailPage />} />
        </Route>

        <Route element={<RoleRoute roles={STAFF_ROLES} />}>
          <Route path="/staff" element={<ManagerDashboardPage />} />
          <Route path="/staff/availability-blocks" element={<AvailabilityBlocksPage />} />
          <Route path="/staff/rentals" element={<OperationsRentalOrdersPage />} />
          <Route path="/staff/rentals/:id" element={<OperationsRentalOrderDetailPage />} />
        </Route>

        <Route element={<CustomerLayout />}>
          <Route path="/" element={<HomePage />} />

          <Route
            path="/garments"
            element={<GarmentListPage />}
          />

          <Route path="/categories" element={<CategoriesPage />} />

          <Route
            path="/garments/:id"
            element={<GarmentDetailPage />}
          />

          <Route element={<RoleRoute roles={CUSTOMER_ROLES} />}>
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/my-rentals" element={<MyRentalOrdersPage />} />
            <Route path="/my-rentals/:id" element={<RentalOrderDetailPage />} />
          </Route>

          <Route element={<RoleRoute roles={AUTHENTICATED_ROLES} />}>
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      </Suspense>
    </>
  )
}

export default App
