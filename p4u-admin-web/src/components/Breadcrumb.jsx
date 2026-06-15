import { Icon } from "@iconify/react";
import { Link } from "react-router-dom";
// eslint-disable-next-line react/prop-types
const Breadcrumb = ({ title, pagetitle, subtitle }) => {
  return (
    <div className='p4u-admin-filter-row align-items-center justify-content-between gap-3 mb-24'>
      <div>
        {subtitle && pagetitle ? (
          <>
            <h4 className='fw-bold mb-8 text-primary-light'>{pagetitle}</h4>
            <p className='text-secondary-light mb-0 text-md'>{subtitle}</p>
          </>
        ) : pagetitle ? (
          <h6 className='fw-semibold mb-0'>{pagetitle}</h6>
        ) : (
          <h6 className='fw-semibold mb-0'>{title}</h6>
        )}
      </div>
      <ul className='d-flex align-items-center gap-2'>
        <li className='fw-medium'>
          <Link
            to='/dashboard'
            className='d-flex align-items-center gap-1 hover-text-primary'
          >
            <Icon
              icon='solar:home-smile-angle-outline'
              className='icon text-lg'
            />
            Dashboard
          </Link>
        </li>
        <li> - </li>
        <li className='fw-medium'>{title}</li>
      </ul>
    </div>
  );
};

export default Breadcrumb;
