import React, { useContext } from "react";
import { Modal, Button, Tag } from "antd";
import { AppContext } from "../../context/appProvider";
import { IoDiamond, IoCheckmarkCircle, IoCloseCircle, IoInformationCircle, IoFlash } from "react-icons/io5";
import "./upgradeProModal.scss";

export default function UpgradeModal() {
  const { isUpgradeProVisible, setIsUpgradeProVisible } = useContext(AppContext);

  const plans = [
    { key: 'free', title: 'Standard', price: '0đ', label: 'Cơ bản', type: 'default' },
    { key: 'pro', title: 'Pro', price: '59.000đ', label: 'Phổ biến nhất', type: 'primary', popular: true },
    { key: 'max', title: 'Max', price: '99.000đ', label: 'Đẳng cấp nhất', type: 'primary', max: true }
  ];

  const features = [
    {
      name: 'Chat ẩn danh người lạ',
      free: false, pro: true, max: true,
      desc: 'Kết nối bí mật, trò chuyện không giới hạn.'
    },
    {
      name: 'Lọc đối tượng tìm kiếm',
      free: false, pro: false, max: true,
      desc: 'Lọc theo giới tính, khu vực.'
    },
    {
      name: 'Trợ lý ảo @Bot AI',
      free: false, pro: true, max: true,
      desc: 'Tóm tắt nội dung chat, giải đáp thông minh bằng AI.'
    },
    {
      name: 'Chế độ ẩn danh',
      free: false, pro: true, max: true,
      desc: 'Trở thành người vô hình, ẩn online.'
    },
    // {
    //   name: 'Tin nhắn & Ảnh tự hủy',
    //   free: false, pro: true, max: true,
    //   desc: 'Bảo mật tuyệt đối, nội dung tự biến mất sau khi đọc.'
    // },
    {
      name: 'Giới hạn gửi file',
      free: '5 MB', pro: '10 MB', max: '25 MB',
      desc: 'Thoải mái gửi video HD và tài liệu dung lượng lớn.'
    },
    {  
      name: 'Đặc quyền nhận diện',
      free: false, 
      pro: (
        <IoDiamond 
          style={{
            color: '#BFC1C2',
            filter: 'drop-shadow(0 0 3px rgba(255, 255, 255, 0.6))',
            fontSize: '16px'
          }} 
        />
      ),
      max: (
        <>
          <IoDiamond 
            style={{
              color: '#FFD700',
              filter: 'drop-shadow(0 0 3px rgba(255, 215, 0, 0.7))',
              fontSize: '16px'
            }} 
          />
          <span style={{margin: '0px 0px 0px 4px'}}>+ special name</span>
        </>
      ),
      desc: 'Nhận diện bên cạnh tên.'
    }
  ];

  const renderStatus = (val, isProCol = false, isMaxCol = false) => {
    if (typeof val === 'boolean') {
      return val ? <IoCheckmarkCircle className="icon-v" /> : <IoCloseCircle className="icon-x" />;
    }
    return <span className={`status-text ${isMaxCol ? 'max-text' : ''}`}>{val}</span>;
  };

  return (
    <Modal
      title={null}
      open={isUpgradeProVisible}
      onCancel={() => setIsUpgradeProVisible(false)}
      footer={null}
      centered
      width={750}
      className="upgrade-modal"
    >
      <div className="upgrade-container">
        <div className="upgrade-header">
          <div className="max-wrapper">
            <IoDiamond className="header-icon" />
          </div>
          <h2>Nâng cấp tài khoản</h2>
          <p>Mở khóa sức mạnh kết nối và bảo mật tối đa</p>
        </div>

        <div className="upgrade-content">
          <div className="comparison-section">
            <div className="comparison-grid">
              <div className="grid-header">Tính năng</div>
              <div className="grid-header text-center">Free</div>
              <div className="grid-header text-center pro-header">Pro</div>
              <div className="grid-header text-center max-header">Max</div>

              {features.map((f, i) => (
                <React.Fragment key={i}>
                  <div className="feature-info-cell">
                    <span className="feature-name">{f.name}</span>
                    <span className="feature-desc">{f.desc}</span>
                  </div>
                  <div className="feature-status">{renderStatus(f.free)}</div>
                  <div className="feature-status pro-col">{renderStatus(f.pro, true)}</div>
                  <div className="feature-status max-col">{renderStatus(f.max, false, true)}</div>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="pricing-section">
            <div className="pricing-grid">
              {plans.map((plan) => (
                <div key={plan.key} className={`price-card ${plan.popular ? 'active' : ''} ${plan.max ? 'max-card' : ''}`}>
                  {plan.popular && <div className="badge-popular">HOT</div>}
                  {plan.max && <div className="badge-max"><IoFlash /> ULTIMATE</div>}
                  <div className="plan-title">{plan.title}</div>
                  <div className={`plan-price ${plan.max ? 'max-price' : ''}`}>{plan.price}</div>
                  <div className="plan-desc">{plan.label}</div>
                  <Button type={plan.type} block className={`select-btn ${plan.max ? 'btn-max' : plan.popular ? 'btn-popular' : ''}`}>
                    {plan.price === '0đ' ? 'Đang sử dụng' : 'Nâng cấp ngay'}
                  </Button>
                </div>
              ))}
            </div>

            <div className="payment-note">
              <IoInformationCircle className="note-icon" />
              <div className="note-content">
                <p className="note-text">Hỗ trợ thanh toán qua MoMo, ZaloPay và Chuyển khoản ngân hàng tại Việt Nam.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}