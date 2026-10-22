/* Mock REST API: chặn window.fetch("/api/...") và trả dữ liệu từ data/demo-data.js */
(function () {
  var D = CB_getDemoData();
  window.__DEMO_D = D;


  /* =========================================================================
     KIẾN TRÚC 3 LỚP (THREE-LAYER ARCHITECTURE)
     Lớp 1: Lõi chung (Core Layer) - Thu thập, lọc, bằng chứng, vụ việc, thông báo, báo cáo
     Lớp 2: Bộ cấu hình ngành (Industry Configuration Packs) - Chủ đề, từ điển, rủi ro, mẫu phản hồi, phân tuyến
     Lớp 3: Cấu hình doanh nghiệp (Enterprise Configuration) - Thương hiệu, đơn vị, nhân sự, SLA, liên hệ, tone
     ========================================================================= */

  function stripAccents(str) {
    return (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd')
      .toLowerCase();
  }

  function matchWords(text, words) {
    if (!text) return false;
    const pat1 = '(^|[^\\p{L}])(' + words.join('|') + ')([^\\p{L}]|$)';
    if (new RegExp(pat1, 'iu').test(text)) return true;
    const normText = stripAccents(text);
    const normWords = words.map(w => stripAccents(w));
    const pat2 = '(^|[^a-z0-9])(' + normWords.join('|') + ')([^a-z0-9]|$)';
    return new RegExp(pat2, 'i').test(normText);
  }

  function matchRegion(branchName, regionName, unitObj) {
    if (!regionName || regionName === 'all') return true;
    if (unitObj) {
      if (unitObj.regionId && unitObj.regionId === regionName) return true;
      if (unitObj.unitId && unitObj.unitId === regionName) return true;
      if (unitObj.regionToken && unitObj.regionToken === regionName) return true;
    }
    if (!branchName) return false;
    if (branchName === regionName || branchName.includes(regionName)) return true;
    const normBranch = stripAccents(branchName).toLowerCase().replace(/\s+/g, '');
    const normReg = stripAccents(regionName).toLowerCase().replace(/\s+/g, '');
    if (normBranch.includes(normReg)) return true;
    const qBranch = normBranch.replace(/quan(\d+)/g, 'q.$1').replace(/q(\d+)/g, 'q.$1');
    const qReg = normReg.replace(/quan(\d+)/g, 'q.$1').replace(/q(\d+)/g, 'q.$1');
    if (qBranch.includes(qReg)) return true;
    const m = branchName.match(/\(([^)]+)\)/);
    if (m) {
      const token = stripAccents(m[1]).toLowerCase().replace(/\s+/g, '').replace(/quan(\d+)/g, 'q.$1').replace(/q(\d+)/g, 'q.$1');
      if (token === qReg) return true;
    }
    return false;
  }

  const INDUSTRY_PACKS = {
    generic: {
      id: 'generic',
      name: 'Doanh nghiệp & Dịch vụ Chung / Đa ngành',
      label: 'Đa ngành',
      defaultUnitType: 'đơn vị',
      topics: {
        service_quality: 'Chất lượng sản phẩm / dịch vụ',
        staff_attitude: 'Thái độ phục vụ / nhân viên',
        pricing_policy: 'Chi phí / chính sách giá',
        customer_support: 'Hỗ trợ khách hàng / xử lý yêu cầu',
        speed_timing: 'Thời gian đáp ứng / tiến độ',
        facility_infra: 'Cơ sở vật chất / hạ tầng'
      },
      keywords: {
        service_quality: ['chất lượng', 'dịch vụ', 'sản phẩm', 'tốt', 'kém', 'lỗi', 'hài lòng'],
        staff_attitude: ['nhân viên', 'thái độ', 'phục vụ', 'nhiệt tình', 'chu đáo', 'khó chịu', 'cộc lốc'],
        pricing_policy: ['chi phí', 'giá', 'hóa đơn', 'đắt', 'hợp lý', 'minh bạch'],
        customer_support: ['hỗ trợ', 'cskh', 'tư vấn', 'tiếp nhận', 'khiếu nại'],
        speed_timing: ['nhanh', 'chậm', 'tiến độ', 'đúng hẹn', 'chờ lâu'],
        facility_infra: ['cơ sở', 'hạ tầng', 'không gian', 'mặt bằng', 'thiết bị']
      },
      positiveMatchers: [
        { id: 'service_quality', icon: '⭐', label: 'chất lượng dịch vụ, sản phẩm tốt', test: (r) => matchWords(r.text, ['chất lượng', 'tốt', 'hài lòng', 'ưng ý', 'chuẩn', 'chuyên nghiệp', 'tuyệt vời', 'đáng tin cậy']) },
        { id: 'staff_attitude', icon: '👥', label: 'nhân sự nhiệt tình, chu đáo', test: (r) => matchWords(r.text, ['nhiệt tình', 'chu đáo', 'thân thiện', 'tận tâm', 'lễ phép', 'hỗ trợ', 'tư vấn tốt']) },
        { id: 'speed_timing', icon: '⚡', label: 'xử lý nhanh chóng, đúng tiến độ', test: (r) => matchWords(r.text, ['nhanh', 'nhanh chóng', 'đúng hẹn', 'kịp thời', 'ngay lập tức', 'tiến độ']) },
        { id: 'pricing_policy', icon: '💰', label: 'chi phí hợp lý, minh bạch', test: (r) => matchWords(r.text, ['hợp lý', 'giá tốt', 'đáng tiền', 'minh bạch', 'phải chăng', 'rõ ràng']) }
      ],
      riskRules: [
        { id: 'service_quality', label: 'phản ánh chất lượng dịch vụ hoặc sản phẩm chưa đạt yêu cầu', match: (r) => matchWords(r.text, ['kém', 'lỗi', 'hỏng', 'dở', 'không đúng', 'thất vọng', 'tệ', 'kém chất lượng']) },
        { id: 'staff_attitude', label: 'phản ánh thái độ nhân viên chưa chuẩn mực hoặc thiếu hỗ trợ', match: (r) => matchWords(r.text, ['thái độ', 'khó chịu', 'cộc lốc', 'lơ là', 'vô trách nhiệm', 'bỏ bê', 'thiếu tôn trọng']) },
        { id: 'speed_timing', label: 'phản ánh chậm trễ hoặc thời gian xử lý kéo dài', match: (r) => matchWords(r.text, ['chậm', 'chờ lâu', 'trễ', 'muộn', 'hẹn lần lữa', 'kéo dài']) },
        { id: 'pricing_policy', label: 'phản ánh về chi phí, phụ thu hoặc thanh toán chưa rõ ràng', match: (r) => matchWords(r.text, ['đắt', 'mập mờ', 'phụ thu', 'sai giá', 'hóa đơn', 'tính nhầm', 'không minh bạch']) }
      ],
      getRoutingDept: (topics = [], text = '', bConfig) => 'Phòng Chăm sóc Khách hàng (CSKH)',
      getDraftReply: (r, bConfig) => 'Kính gửi quý khách ' + (r.author || '') + ', ' + bConfig.name + ' chân thành cảm ơn quý khách đã phản hồi.'
    },

    aesthetic_clinic: {
      id: 'aesthetic_clinic',
      name: 'Thẩm mỹ viện & Da liễu / Phòng khám y khoa',
      label: 'Thẩm mỹ & Y tế',
      defaultUnitType: 'cơ sở',
      topics: {
        doctor: 'Bác sĩ / KTV / tay nghề',
        treatment: 'Liệu trình / phác đồ / hiệu quả',
        sales: 'Tư vấn / chèo kéo / upsell',
        price: 'Chi phí / bảng giá dịch vụ',
        wait: 'Thời gian chờ / đặt lịch hẹn',
        trust: 'Uy tín / cam kết / biến chứng'
      },
      keywords: {
        doctor: ['bác sĩ', 'bac si', 'tay nghề', 'bác sỹ', 'chuyên môn', 'trưởng khoa', 'phẫu thuật', 'bác sĩ trẻ'],
        treatment: ['liệu trình', 'nặn mụn', 'trị nám', 'phun xăm', 'cắt mí', 'nâng mũi', 'tiêm', 'filler', 'botox', 'chăm sóc da', 'spa', 'da liễu', 'hiệu quả'],
        sales: ['upsell', 'chèo kéo', 'tư vấn', 'bán thêm', 'sale', 'mua gói', 'ép mua'],
        price: ['giá', 'bảng giá', 'chi phí', 'chém giá', 'đắt', 'tiền', 'phụ thu'],
        wait: ['chờ', 'đợi', 'chờ lâu', 'hẹn', 'đặt lịch', 'trễ', 'bắt chờ'],
        trust: ['uy tín', 'tin tưởng', 'an tâm', 'chính hãng', 'chuyên nghiệp', 'cam kết', 'biến chứng']
      },
      positiveMatchers: [
        { id: 'doctor', icon: '👨‍⚕️', label: 'bác sĩ/KTV tay nghề giỏi, tư vấn chu đáo', test: (r) => matchWords(r.text, ['bác sĩ', 'bac si', 'tay nghề', 'chuyên nghiệp', 'bác sỹ', 'tận tình']) },
        { id: 'treatment', icon: '✨', label: 'liệu trình hiệu quả, da cải thiện rõ', test: (r) => matchWords(r.text, ['hiệu quả', 'cải thiện', 'đẹp', 'hài lòng', 'mịn', 'sáng', 'đỡ hẳn']) },
        { id: 'staff', icon: '🌟', label: 'dịch vụ ân cần, không gian sang trọng', test: (r) => matchWords(r.text, ['chu đáo', 'ân cần', 'sạch sẽ', 'sang trọng', 'đẹp', 'thoải mái']) }
      ],
      riskRules: [
        { id: 'doctor_skill', label: 'phản ánh bác sĩ/KTV tay nghề non trẻ, thuê ngoài', match: (r) => matchWords(r.text, ['tay nghề yếu', 'non trẻ', 'thuê ngoài', 'chưa có kinh nghiệm', 'đau', 'hỏng']) },
        { id: 'upsell', label: 'phản ánh nhân viên chèo kéo, chỉ quan tâm upsell bán thêm', match: (r) => matchWords(r.text, ['upsell', 'bán thêm', 'chèo kéo', 'chỉ quan tâm', 'mua thêm', 'sale']) },
        { id: 'wait', label: 'phản ánh bị bắt chờ gần 1 tiếng dù đã đặt lịch', match: (r) => matchWords(r.text, ['chờ', 'đợi', 'chờ lâu', 'bắt chờ', 'gần 1 tiếng']) }
      ],
      getRoutingDept: (topics = [], text = '', bConfig) => 'Hội đồng Bác sĩ chuyên môn & Trưởng khoa',
      getDraftReply: (r, bConfig) => 'Kính gửi quý khách ' + (r.author || '') + ', ' + bConfig.name + ' chân thành cảm ơn quý khách đã tin tưởng dịch vụ thẩm mỹ y khoa.'
    },

    f_and_b: {
      id: 'f_and_b',
      name: 'Nhà hàng & F&B / Ẩm thực',
      label: 'Nhà hàng & Ẩm thực',
      defaultUnitType: 'nhà hàng',
      topics: {
        food_quality: 'Chất lượng món ăn / hương vị',
        service_staff: 'Thái độ phục vụ / nhân viên bàn',
        hygiene: 'Vệ sinh an toàn thực phẩm',
        wait_time: 'Thời gian lên món / đặt bàn',
        price_bill: 'Giá cả / thanh toán hóa đơn',
        ambiance: 'Không gian / chỗ ngồi / bãi xe'
      },
      keywords: {
        food_quality: ['món ăn', 'đồ ăn', 'hương vị', 'ngon', 'dở', 'lẩu', 'thịt', 'nước lẩu', 'nguội', 'chua', 'mặn', 'nhạt', 'nêm', 'món'],
        service_staff: ['phục vụ', 'nhân viên', 'thái độ', 'bàn', 'châm nước', 'lơ là', 'khó chịu', 'nhiệt tình', 'chu đáo', 'gọi mãi'],
        hygiene: ['vệ sinh', 'sạch sẽ', 'bẩn', 'ruồi', 'dơ', 'bát đĩa', 'an toàn thực phẩm', 'dị ứng', 'sạn'],
        wait_time: ['lên món', 'chờ món', 'đặt bàn', 'chờ lâu', 'nhanh', 'bắt chờ'],
        price_bill: ['giá', 'hóa đơn', 'tính tiền', 'phụ thu', 'đắt', 'hợp lý', 'buffet', 'tính nhầm'],
        ambiance: ['không gian', 'chỗ ngồi', 'bãi xe', 'máy lạnh', 'ấm cúng', 'ồn ào', 'view']
      },
      positiveMatchers: [
        { id: 'food_quality', icon: '🍲', label: 'món ăn ngon, hương vị đậm đà', test: (r) => matchWords(r.text, ['ngon', 'đậm đà', 'tươi', 'hợp khẩu vị', 'nước lẩu ngon', 'tuyệt vời']) },
        { id: 'service_staff', icon: '👨‍🍳', label: 'phục vụ nhanh nhẹn, chu đáo', test: (r) => matchWords(r.text, ['nhiệt tình', 'chu đáo', 'nhanh nhẹn', 'vui vẻ', 'thân thiện']) }
      ],
      riskRules: [
        { id: 'food_risk', label: 'phản ánh món ăn nguội, chất lượng nguyên liệu chưa đạt', match: (r) => matchWords(r.text, ['nguội', 'dở', 'không tươi', 'mặn', 'thiu', 'tanh', 'đau bụng']) },
        { id: 'service_risk', label: 'phản ánh nhân viên lơ là, gọi mãi không ai tiếp', match: (r) => matchWords(r.text, ['lơ là', 'khó chịu', 'gọi mãi', 'thái độ kém', 'chậm chạp']) }
      ],
      getRoutingDept: (topics = [], text = '', bConfig) => 'Bếp trưởng & Quản lý Nhà hàng',
      getDraftReply: (r, bConfig) => 'Dạ em chào quý khách ' + (r.author || '') + ', ' + bConfig.name + ' chân thành cảm ơn quý khách đã ghé dùng bữa tại nhà hàng.'
    },

    retail_ecommerce: {
      id: 'retail_ecommerce',
      name: 'Bán lẻ & Thương mại điện tử / Thiết bị số',
      label: 'Bán lẻ & Công nghệ',
      defaultUnitType: 'cửa hàng',
      topics: {
        product_quality: 'Chất lượng sản phẩm / chính hãng',
        warranty_return: 'Bảo hành / đổi trả / kỹ thuật',
        shipping_delivery: 'Giao hàng / đóng gói / vận chuyển',
        staff_service: 'Thái độ tư vấn / hỗ trợ kỹ thuật',
        price_promotion: 'Giá cả / khuyến mãi / trả góp',
        policy_transparency: 'Chính sách / hóa đơn / cam kết'
      },
      keywords: {
        product_quality: ['sản phẩm', 'chất lượng', 'hàng', 'chính hãng', 'máy', 'laptop', 'điện thoại', 'linh kiện', 'lỗi', 'hỏng', 'pin', 'màn hình', 'iphone'],
        warranty_return: ['bảo hành', 'đổi trả', 'trung tâm bảo hành', 'sửa chữa', 'từ chối', 'hãng', 'đổi mới', 'bảo hành kém'],
        shipping_delivery: ['giao hàng', 'vận chuyển', 'giao trễ', 'móp méo', 'đóng gói', 'shipper', 'hỏa tốc', 'nhanh', 'hư hỏng'],
        staff_service: ['tư vấn', 'nhân viên', 'kỹ thuật', 'thái độ', 'hỗ trợ', 'cài đặt', 'thờ ơ', 'nhiệt tình'],
        price_promotion: ['giá', 'khuyến mãi', 'ưu đãi', 'giảm giá', 'trả góp', 'voucher', 'đắt', 'rẻ'],
        policy_transparency: ['chính sách', 'hóa đơn', 'vat', 'minh bạch', 'rõ ràng', 'cam kết']
      },
      positiveMatchers: [
        { id: 'product_quality', icon: '📱', label: 'sản phẩm chính hãng, dùng mượt mà', test: (r) => matchWords(r.text, ['chính hãng', 'mượt', 'tốt', 'nguyên seal', 'chất lượng', 'hài lòng']) },
        { id: 'shipping_delivery', icon: '🚚', label: 'giao hàng hỏa tốc, đóng gói kỹ', test: (r) => matchWords(r.text, ['nhanh', 'hỏa tốc', 'kỹ càng', 'đóng gói tốt', 'đúng hẹn']) }
      ],
      riskRules: [
        { id: 'warranty_return', label: 'phản ánh bảo hành từ chối hoặc đổi trả chậm trễ', match: (r) => matchWords(r.text, ['bảo hành', 'từ chối', 'đổi trả', 'lỗi', 'giam máy', 'đùn đẩy']) },
        { id: 'shipping_delivery', label: 'phản ánh giao hàng trễ hẹn hoặc hộp móp méo', match: (r) => matchWords(r.text, ['giao trễ', 'chậm', 'móp méo', 'bể góc', 'vỡ', 'hư hỏng']) }
      ],
      getRoutingDept: (topics = [], text = '', bConfig) => 'Trung tâm Kỹ thuật & Bảo hành',
      getDraftReply: (r, bConfig) => 'Kính gửi quý khách ' + (r.author || '') + ', ' + bConfig.name + ' chân thành cảm ơn quý khách đã tin chọn sản phẩm công nghệ.'
    }
  };

  function getIndustryPack(indId) {
    if (INDUSTRY_PACKS[indId]) return INDUSTRY_PACKS[indId];
    const norm = stripAccents(indId || '');
    if (norm.includes('nha hang') || norm.includes('f&b') || norm.includes('am thuc') || norm.includes('quan an') || norm.includes('lau') || norm.includes('cafe')) return INDUSTRY_PACKS.f_and_b;
    if (norm.includes('ban le') || norm.includes('retail') || norm.includes('cua hang') || norm.includes('thuong mai') || norm.includes('e-com') || norm.includes('shop')) return INDUSTRY_PACKS.retail_ecommerce;
    if (norm.includes('tham my') || norm.includes('clinic') || norm.includes('spa') || norm.includes('y te') || norm.includes('benh vien') || norm.includes('bac si') || norm.includes('phong kham')) return INDUSTRY_PACKS.aesthetic_clinic;
    return INDUSTRY_PACKS.generic;
  }

  function getBrandConfig(brandId) {
    let b = null;
    try {
      const cfgObj = typeof D.config === 'string' ? JSON.parse(D.config) : D.config;
      b = (cfgObj.brands || []).find(x => x.id === brandId);
    } catch (e) { }
    if (!b && window.S && window.S.cfg && window.S.cfg.brands) {
      b = window.S.cfg.brands.find(x => x.id === brandId);
    }
    return b || { id: brandId, name: brandId, industry: 'generic', unitType: 'đơn vị', hotline: 'hotline CSKH', staff: [] };
  }
  window.stripAccents = stripAccents;
  window.matchWords = matchWords;
  window.matchRegion = matchRegion;
  window.INDUSTRY_PACKS = INDUSTRY_PACKS;
  window.getIndustryPack = getIndustryPack;
  window.getBrandConfig = getBrandConfig;

  /* =========================================================================
     DANH MỤC ĐỊA ĐIỂM DÙNG CHUNG (SHARED LOCATIONS DIRECTORY)
     Cung cấp nguồn dữ liệu địa điểm chuẩn mực cho toàn bộ hệ thống
     ========================================================================= */
  var SHARED_LOCATIONS = [
    // --- Seoul Center (Thẩm mỹ & Y tế) ---
    {
      locationId: 'loc_sc_binh_thanh',
      workspaceId: 'ws_default',
      brandId: 'seoul-center',
      displayName: 'Seoul Center - Bình Thạnh',
      fullName: 'Seoul Center - Bùi Hữu Nghĩa (Bình Thạnh)',
      branchCode: 'SC-BT-01',
      industry: 'aesthetic_clinic',
      primaryCategory: 'Phòng khám chuyên khoa Thẩm mỹ & Da liễu',
      secondaryCategories: ['Chăm sóc da chuyên sâu'],
      address: '375 Bùi Hữu Nghĩa, Phường 2, Quận Bình Thạnh, TP.HCM',
      region: 'Bình Thạnh',
      province: 'TP.HCM',
      timezone: 'Asia/Ho_Chi_Minh',
      coordinates: { lat: 10.7981, lng: 106.6965 },
      phone: '0941 623 322',
      website: 'https://seoulcenter.vn',
      bookingUrl: 'https://seoulcenter.vn/dat-lich-hen',
      description: 'Hệ thống Thẩm mỹ viện Seoul Center chi nhánh Bình Thạnh quy mô hiện đại chuẩn y khoa. Cung cấp các dịch vụ chăm sóc da công nghệ cao, trẻ hóa da chuyên sâu và thẩm mỹ toàn diện.',
      regularHours: {
        mon: '08:00 - 20:30',
        tue: '08:00 - 20:30',
        wed: '08:00 - 20:30',
        thu: '08:00 - 20:30',
        fri: '08:00 - 20:30',
        sat: '08:00 - 21:00',
        sun: '08:00 - 21:00'
      },
      specialHours: [
        { date: '2026-09-02', closed: false, hours: '08:00 - 18:00', note: 'Quốc khánh' }
      ],
      attributes: ['Wi-Fi miễn phí', 'Chấp nhận thẻ', 'Bãi đỗ xe máy & ô tô', 'Phòng VIP riêng tư', 'Hỗ trợ đặt hẹn online'],
      services: ['Cấy Collagen tươi đa tầng', 'Trị nám Laser PicoSure', 'Nâng cơ trẻ hóa da Ultra Hifu', 'Tắm trắng phi thuyền'],
      media: {
        logo: 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=200',
        cover: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800',
        interior: ['https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600'],
        exterior: ['https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600']
      },
      placeId: 'ChIJd7U3Y_AtdTERyq-3iN5kQ5k',
      cid: '108512398234871234',
      googleAccountId: 'accounts/108923412345',
      googleLocationId: 'locations/98712345678',
      groups: ['Khu vực TP.HCM', 'Chi nhánh Flagship'],
      manager: 'BS. CKII Nguyễn Minh Trang',
      ownership: 'managed',
      businessStatus: 'OPEN',
      connectionStatus: 'connected',
      internalStatus: 'active',
      source: 'gbp',
      lastSyncedAt: '2026-10-15T08:06:48Z',
      googleRating: 4.80,
      googleTotalReviews: 338,
      performance: {
        searchImpressions: 14250,
        callClicks: 320,
        directionRequests: 580,
        websiteClicks: 910,
        searchQueries: [
          { query: 'thẩm mỹ viện bình thạnh uy tín', count: 1840 },
          { query: 'trị nám seoul center', count: 1420 },
          { query: 'chăm sóc da gần đây', count: 760 }
        ]
      }
    },
    {
      locationId: 'loc_sc_quan_10',
      workspaceId: 'ws_default',
      brandId: 'seoul-center',
      displayName: 'Seoul Center - Quận 10',
      fullName: 'Seoul Center - Nguyễn Thượng Hiền (Q.10)',
      branchCode: 'SC-Q10-02',
      industry: 'aesthetic_clinic',
      primaryCategory: 'Phòng khám chuyên khoa Thẩm mỹ & Da liễu',
      secondaryCategories: ['Nha khoa thẩm mỹ', 'Chăm sóc da'],
      address: '375 Nguyễn Thượng Hiền, Phường 11, Quận 10, TP.HCM',
      region: 'Quận 10',
      province: 'TP.HCM',
      timezone: 'Asia/Ho_Chi_Minh',
      coordinates: { lat: 10.7712, lng: 106.6781 },
      phone: '0941 623 322',
      website: 'https://seoulcenter.vn',
      bookingUrl: 'https://seoulcenter.vn/dat-lich-hen',
      description: 'Hệ thống Thẩm mỹ viện Seoul Center chi nhánh Quận 10 quy mô chuẩn quốc tế. Cung cấp các giải pháp chăm sóc da công nghệ cao và phẫu thuật thẩm mỹ an toàn với đội ngũ bác sĩ đầu ngành.',
      regularHours: {
        mon: '08:00 - 20:30',
        tue: '08:00 - 20:30',
        wed: '08:00 - 20:30',
        thu: '08:00 - 20:30',
        fri: '08:00 - 20:30',
        sat: '08:00 - 21:00',
        sun: '08:00 - 21:00'
      },
      specialHours: [],
      attributes: ['Wi-Fi miễn phí', 'Chấp nhận thẻ', 'Bãi đỗ xe máy & ô tô', 'Phòng VIP riêng tư', 'Đặt hẹn trước'],
      services: ['Nâng mũi cấu trúc Korea', 'Cắt mí Mini Deep', 'Trẻ hóa da Laser PicoSure', 'Nâng cơ Ultra Hifu'],
      media: {
        logo: 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=200',
        cover: 'https://images.unsplash.com/photo-1629909615184-74f495363b67?w=800',
        interior: ['https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=600'],
        exterior: ['https://images.unsplash.com/photo-1629909615184-74f495363b67?w=600']
      },
      placeId: 'ChIJb6e9T9CuEmsR198b1l2k',
      cid: '108512398234871235',
      googleAccountId: 'accounts/108923412345',
      googleLocationId: 'locations/98712345679',
      groups: ['Khu vực TP.HCM', 'Chi nhánh Flagship'],
      manager: 'ThS. BS Trần Tuấn Anh',
      ownership: 'managed',
      businessStatus: 'OPEN',
      connectionStatus: 'connected',
      internalStatus: 'active',
      source: 'gbp',
      lastSyncedAt: '2026-10-15T08:06:48Z',
      googleRating: 4.90,
      googleTotalReviews: 627,
      performance: {
        searchImpressions: 21400,
        callClicks: 490,
        directionRequests: 820,
        websiteClicks: 1250,
        searchQueries: [
          { query: 'thẩm mỹ viện uy tín quận 10', count: 2480 },
          { query: 'seoul center nguyễn thượng hiền', count: 1650 },
          { query: 'nâng mũi uy tín tphcm', count: 910 }
        ]
      }
    },
    {
      locationId: 'loc_sc_tan_binh',
      workspaceId: 'ws_default',
      brandId: 'seoul-center',
      displayName: 'Seoul Center - Tân Bình',
      fullName: 'Seoul Center - Ni Sư Huỳnh Liên (Tân Bình)',
      branchCode: 'SC-TB-03',
      industry: 'aesthetic_clinic',
      primaryCategory: 'Thẩm mỹ viện & Chăm sóc da',
      secondaryCategories: [],
      address: '314 Ni Sư Huỳnh Liên, Phường 10, Quận Tân Bình, TP.HCM',
      region: 'Tân Bình',
      province: 'TP.HCM',
      timezone: 'Asia/Ho_Chi_Minh',
      coordinates: { lat: 10.7854, lng: 106.6432 },
      phone: '0941 623 322',
      website: 'https://seoulcenter.vn',
      bookingUrl: '', // Chưa cấu hình bookingUrl để test cảnh báo
      description: 'Cơ sở Tân Bình.', // Ngắn dưới 25 ký tự -> test Profile Completeness missing
      regularHours: {
        mon: '08:00 - 20:00',
        tue: '08:00 - 20:00',
        wed: '08:00 - 20:00',
        thu: '08:00 - 20:00',
        fri: '08:00 - 20:00',
        sat: '08:00 - 20:00',
        sun: '08:00 - 20:00'
      },
      specialHours: [],
      attributes: ['Wi-Fi miễn phí'],
      services: ['Chăm sóc da', 'Cấy tảo xoắn Nano'],
      media: {
        logo: '',
        cover: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800',
        interior: [],
        exterior: []
      },
      placeId: 'ChIJ389ab31cEmsRU1238712',
      cid: '108512398234871236',
      googleAccountId: 'accounts/108923412345',
      googleLocationId: 'locations/98712345680',
      groups: ['Khu vực TP.HCM'],
      manager: 'QLCN - Hoàng Oanh (Tân Bình)',
      ownership: 'managed',
      businessStatus: 'OPEN',
      connectionStatus: 'connected',
      internalStatus: 'active',
      source: 'gbp',
      lastSyncedAt: '2026-10-15T08:06:48Z',
      googleRating: 4.70,
      googleTotalReviews: 133,
      performance: {
        searchImpressions: 5800,
        callClicks: 110,
        directionRequests: 210,
        websiteClicks: 340,
        searchQueries: [
          { query: 'seoul center ni sư huỳnh liên', count: 640 },
          { query: 'spa tân bình uy tín', count: 420 }
        ]
      }
    },

    // --- JIVI Clinic (Phòng khám thẩm mỹ) ---
    {
      locationId: 'loc_jivi_pn',
      workspaceId: 'ws_default',
      brandId: 'jivi-clinic',
      displayName: 'JIVI Clinic - Phan Xích Long',
      fullName: 'JIVI Clinic - Phan Xích Long (Phú Nhuận)',
      branchCode: 'JV-PN-01',
      industry: 'aesthetic_clinic',
      primaryCategory: 'Phòng khám Da liễu & Thẩm mỹ',
      address: '87 Phan Xích Long, Phường 2, Quận Phú Nhuận, TP.HCM',
      region: 'Phú Nhuận',
      province: 'TP.HCM',
      timezone: 'Asia/Ho_Chi_Minh',
      coordinates: { lat: 10.7981, lng: 106.6894 },
      phone: '0906 888 777',
      website: 'https://jiviclinic.vn',
      bookingUrl: 'https://jiviclinic.vn/dat-lich',
      description: 'JIVI Clinic là viện thẩm mỹ chuyên khoa điều trị mụn, sẹo rỗ và sắc tố da hàng đầu với phác đồ chuẩn y khoa kết hợp công nghệ ánh sáng sinh học tân tiến.',
      regularHours: {
        mon: '09:00 - 20:00',
        tue: '09:00 - 20:00',
        wed: '09:00 - 20:00',
        thu: '09:00 - 20:00',
        fri: '09:00 - 20:00',
        sat: '09:00 - 20:00',
        sun: '09:00 - 18:00'
      },
      specialHours: [],
      attributes: ['Wi-Fi miễn phí', 'Thanh toán thẻ', 'Có chỗ đậu xe hơi', 'Phòng khám vô trùng'],
      services: ['Trị mụn chuẩn y khoa', 'Trị sẹo rỗ Fractional CO2', 'Phục hồi da tổn thương'],
      media: {
        logo: 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=200',
        cover: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800',
        interior: ['https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600'],
        exterior: ['https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600']
      },
      placeId: 'ChIJjivi_pn_fake_place_id',
      cid: '108512398234871237',
      googleAccountId: 'accounts/108923412346',
      googleLocationId: 'locations/98712345681',
      groups: ['Khu vực TP.HCM'],
      manager: 'BS. Phan Hà Lan',
      ownership: 'managed',
      businessStatus: 'OPEN',
      connectionStatus: 'connected',
      internalStatus: 'active',
      source: 'gbp',
      lastSyncedAt: '2026-10-15T09:00:00Z',
      googleRating: 4.88,
      googleTotalReviews: 89,
      performance: {
        searchImpressions: 8900,
        callClicks: 195,
        directionRequests: 340,
        websiteClicks: 520,
        searchQueries: [
          { query: 'trị mụn jivi phan xích long', count: 980 },
          { query: 'phòng khám da liễu phú nhuận', count: 640 }
        ]
      }
    },

    // --- Golden Hotpot (F&B) ---
    {
      locationId: 'loc_gh_q1',
      workspaceId: 'ws_default',
      brandId: 'golden-hotpot',
      displayName: 'Golden Hotpot - Bùi Viện',
      fullName: 'Golden Hotpot - Bùi Viện (Q.1)',
      branchCode: 'GH-Q1-01',
      industry: 'f_and_b',
      primaryCategory: 'Nhà hàng Lẩu & Nướng Buffet',
      address: '42 Bùi Viện, Phường Phạm Ngũ Lão, Quận 1, TP.HCM',
      region: 'Quận 1',
      province: 'TP.HCM',
      timezone: 'Asia/Ho_Chi_Minh',
      coordinates: { lat: 10.7678, lng: 106.6934 },
      phone: '1900 6868',
      website: 'https://goldenhotpot.vn',
      bookingUrl: 'https://goldenhotpot.vn/dat-ban',
      description: 'Hương vị lẩu truyền thống kết hợp tinh hoa ẩm thực Á Đông. Phục vụ thực khách với hơn 60 món nhúng thượng hạng và không gian hiện đại ấm cúng.',
      regularHours: {
        mon: '10:00 - 23:00',
        tue: '10:00 - 23:00',
        wed: '10:00 - 23:00',
        thu: '10:00 - 23:00',
        fri: '10:00 - 23:00',
        sat: '10:00 - 24:00',
        sun: '10:00 - 24:00'
      },
      specialHours: [],
      attributes: ['Có máy lạnh', 'Chấp nhận thẻ', 'Có bàn ngoài trời', 'Ghế cho trẻ em'],
      services: ['Buffet lẩu thượng hạng', 'Set ăn gia đình', 'Bàn tiệc sinh nhật'],
      media: {
        logo: 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=200',
        cover: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
        interior: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600'],
        exterior: ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600']
      },
      placeId: 'ChIJgh_q1_fake_place_id',
      cid: '108512398234871238',
      googleAccountId: 'accounts/108923412347',
      googleLocationId: 'locations/98712345682',
      groups: ['Khu vực TP.HCM', 'Khu trung tâm'],
      manager: 'Bếp trưởng - Nguyễn Văn Kiên',
      ownership: 'managed',
      businessStatus: 'OPEN',
      connectionStatus: 'connected',
      internalStatus: 'active',
      source: 'gbp',
      lastSyncedAt: '2026-10-15T09:00:00Z',
      googleRating: 4.60,
      googleTotalReviews: 185,
      performance: {
        searchImpressions: 16800,
        callClicks: 420,
        directionRequests: 790,
        websiteClicks: 1120,
        searchQueries: [
          { query: 'lẩu ngon quận 1', count: 1890 },
          { query: 'golden hotpot bùi viện', count: 1450 }
        ]
      }
    },
    {
      locationId: 'loc_gh_q10',
      workspaceId: 'ws_default',
      brandId: 'golden-hotpot',
      displayName: 'Golden Hotpot - Sư Vạn Hạnh',
      fullName: 'Golden Hotpot - Sư Vạn Hạnh (Q.10)',
      branchCode: 'GH-Q10-02',
      industry: 'f_and_b',
      primaryCategory: 'Nhà hàng Lẩu',
      address: '11 Vạn Hạnh Mall, Sư Vạn Hạnh, Phường 12, Quận 10, TP.HCM',
      region: 'Quận 10',
      province: 'TP.HCM',
      timezone: 'Asia/Ho_Chi_Minh',
      coordinates: { lat: 10.7731, lng: 106.6698 },
      phone: '1900 6868',
      website: 'https://goldenhotpot.vn',
      bookingUrl: 'https://goldenhotpot.vn/dat-ban',
      description: 'Chi nhánh Vạn Hạnh Mall không gian hiện đại, thích hợp cho liên hoan bạn bè và gia đình.',
      regularHours: {
        mon: '10:00 - 22:00',
        tue: '10:00 - 22:00',
        wed: '10:00 - 22:00',
        thu: '10:00 - 22:00',
        fri: '10:00 - 22:00',
        sat: '10:00 - 22:30',
        sun: '10:00 - 22:30'
      },
      specialHours: [],
      attributes: ['Trong trung tâm thương mại', 'Máy lạnh', 'Thanh toán ví điện tử'],
      services: ['Buffet lẩu'],
      media: {
        logo: '',
        cover: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
        interior: [],
        exterior: []
      },
      placeId: 'ChIJgh_q10_fake_place_id',
      cid: '108512398234871239',
      googleAccountId: 'accounts/108923412347',
      googleLocationId: 'locations/98712345683',
      groups: ['Khu vực TP.HCM'],
      manager: 'QL Chi nhánh - Đặng Thu Thảo',
      ownership: 'managed',
      businessStatus: 'OPEN',
      connectionStatus: 'connected',
      internalStatus: 'active',
      source: 'gbp',
      lastSyncedAt: '2026-10-15T09:00:00Z',
      googleRating: 4.70,
      googleTotalReviews: 240,
      performance: {
        searchImpressions: 19500,
        callClicks: 380,
        directionRequests: 860,
        websiteClicks: 940,
        searchQueries: [
          { query: 'ăn gì vạn hạnh mall', count: 2150 },
          { query: 'lẩu vạn hạnh mall', count: 1670 }
        ]
      }
    },
    {
      locationId: 'loc_gh_tan_binh',
      workspaceId: 'ws_default',
      brandId: 'golden-hotpot',
      displayName: 'Golden Hotpot - Lê Văn Sỹ',
      fullName: 'Golden Hotpot - Lê Văn Sỹ (Tân Bình)',
      branchCode: 'GH-TB-03',
      industry: 'f_and_b',
      primaryCategory: 'Nhà hàng Lẩu',
      address: '380 Lê Văn Sỹ, Phường 2, Quận Tân Bình, TP.HCM',
      region: 'Tân Bình',
      province: 'TP.HCM',
      timezone: 'Asia/Ho_Chi_Minh',
      coordinates: { lat: 10.7925, lng: 106.6621 },
      phone: '1900 6868',
      website: 'https://goldenhotpot.vn',
      bookingUrl: 'https://goldenhotpot.vn/dat-ban',
      description: 'Không gian ấm cúng tại con đường ẩm thực Lê Văn Sỹ.',
      regularHours: {
        mon: '10:00 - 22:30',
        tue: '10:00 - 22:30',
        wed: '10:00 - 22:30',
        thu: '10:00 - 22:30',
        fri: '10:00 - 22:30',
        sat: '10:00 - 23:00',
        sun: '10:00 - 23:00'
      },
      specialHours: [],
      attributes: ['Có máy lạnh', 'Có bãi xe máy'],
      services: ['Buffet lẩu'],
      media: {
        logo: '',
        cover: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
        interior: [],
        exterior: []
      },
      placeId: 'ChIJgh_tb_fake_place_id',
      cid: '108512398234871240',
      googleAccountId: 'accounts/108923412347',
      googleLocationId: 'locations/98712345684',
      groups: ['Khu vực TP.HCM'],
      manager: 'QL Nhà hàng - Vũ Tuấn',
      ownership: 'managed',
      businessStatus: 'OPEN',
      connectionStatus: 'connected',
      internalStatus: 'active',
      source: 'gbp',
      lastSyncedAt: '2026-10-15T09:00:00Z',
      googleRating: 4.65,
      googleTotalReviews: 128,
      performance: {
        searchImpressions: 11200,
        callClicks: 260,
        directionRequests: 450,
        websiteClicks: 620,
        searchQueries: [
          { query: 'quán ăn lê văn sỹ', count: 1420 },
          { query: 'lẩu lê văn sỹ', count: 980 }
        ]
      }
    },

    // --- TechZone Smart Retail (Retail) ---
    {
      locationId: 'loc_tz_q1',
      workspaceId: 'ws_default',
      brandId: 'techzone-store',
      displayName: 'TechZone - Hai Bà Trưng',
      fullName: 'TechZone - Flagship Hai Bà Trưng (Q.1)',
      branchCode: 'TZ-Q1-01',
      industry: 'retail_ecommerce',
      primaryCategory: 'Cửa hàng điện tử & Công nghệ',
      address: '158 Hai Bà Trưng, Phường Đa Kao, Quận 1, TP.HCM',
      region: 'Quận 1',
      province: 'TP.HCM',
      timezone: 'Asia/Ho_Chi_Minh',
      coordinates: { lat: 10.7845, lng: 106.6967 },
      phone: '1800 8899',
      website: 'https://techzone.vn',
      bookingUrl: '', // Bán lẻ không bắt buộc booking
      description: 'Showroom công nghệ trải nghiệm sản phẩm Apple, laptop gaming, linh kiện PC cao cấp và thiết bị thông minh smarthome chính hãng.',
      regularHours: {
        mon: '08:30 - 21:30',
        tue: '08:30 - 21:30',
        wed: '08:30 - 21:30',
        thu: '08:30 - 21:30',
        fri: '08:30 - 21:30',
        sat: '08:30 - 22:00',
        sun: '08:30 - 22:00'
      },
      specialHours: [],
      attributes: ['Có máy lạnh', 'Thanh toán thẻ & trả góp 0%', 'Có bãi đỗ xe'],
      services: ['Bán lẻ thiết bị số', 'Bảo hành & cài đặt phần mềm', 'Thu cũ đổi mới'],
      media: {
        logo: 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=200',
        cover: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800',
        interior: ['https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600'],
        exterior: ['https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600']
      },
      placeId: 'ChIJtz_q1_fake_place_id',
      cid: '108512398234871241',
      googleAccountId: 'accounts/108923412348',
      googleLocationId: 'locations/98712345685',
      groups: ['Khu vực TP.HCM', 'Showroom Flagship'],
      manager: 'QL Cửa hàng - Phan Bá Đạt',
      ownership: 'managed',
      businessStatus: 'OPEN',
      connectionStatus: 'connected',
      internalStatus: 'active',
      source: 'gbp',
      lastSyncedAt: '2026-10-15T09:00:00Z',
      googleRating: 4.75,
      googleTotalReviews: 310,
      performance: {
        searchImpressions: 26500,
        callClicks: 580,
        directionRequests: 1120,
        websiteClicks: 2450,
        searchQueries: [
          { query: 'mua iphone 16 chính hãng', count: 3200 },
          { query: 'cửa hàng công nghệ quận 1', count: 1870 }
        ]
      }
    },
    {
      locationId: 'loc_tz_thai_ha',
      workspaceId: 'ws_default',
      brandId: 'techzone-store',
      displayName: 'TechZone - Thái Hà',
      fullName: 'TechZone - Thái Hà (Hà Nội)',
      branchCode: 'TZ-HN-02',
      industry: 'retail_ecommerce',
      primaryCategory: 'Cửa hàng thiết bị số',
      address: '98 Thái Hà, Phường Trung Liệt, Quận Đống Đa, Hà Nội',
      region: 'Hà Nội',
      province: 'Hà Nội',
      timezone: 'Asia/Ho_Chi_Minh',
      coordinates: { lat: 21.0123, lng: 105.8194 },
      phone: '1800 8899',
      website: 'https://techzone.vn',
      bookingUrl: '',
      description: 'Showroom công nghệ tại trung tâm phố công nghệ Thái Hà, Hà Nội.',
      regularHours: {
        mon: '08:30 - 21:30',
        tue: '08:30 - 21:30',
        wed: '08:30 - 21:30',
        thu: '08:30 - 21:30',
        fri: '08:30 - 21:30',
        sat: '08:30 - 21:30',
        sun: '08:30 - 21:30'
      },
      specialHours: [],
      attributes: ['Có máy lạnh', 'Thanh toán thẻ'],
      services: ['Bán lẻ'],
      media: {
        logo: '',
        cover: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800',
        interior: [],
        exterior: []
      },
      placeId: 'ChIJtz_cg_fake_place_id',
      cid: '108512398234871242',
      googleAccountId: 'accounts/108923412348',
      googleLocationId: 'locations/98712345686',
      groups: ['Khu vực Miền Bắc'],
      manager: 'Phụ trách miền Bắc - Lê Thắng',
      ownership: 'managed',
      businessStatus: 'OPEN',
      connectionStatus: 'connected',
      internalStatus: 'active',
      source: 'gbp',
      lastSyncedAt: '2026-10-15T09:00:00Z',
      googleRating: 4.80,
      googleTotalReviews: 245,
      performance: {
        searchImpressions: 14200,
        callClicks: 310,
        directionRequests: 620,
        websiteClicks: 1180,
        searchQueries: [
          { query: 'techzone thái hà', count: 1650 },
          { query: 'laptop chính hãng hà nội', count: 1240 }
        ]
      }
    },
    {
      locationId: 'loc_tz_ecom',
      workspaceId: 'ws_default',
      brandId: 'techzone-store',
      displayName: 'TechZone - Online Hub',
      fullName: 'TechZone - Kênh Online E-com',
      branchCode: 'TZ-EC-03',
      industry: 'retail_ecommerce',
      primaryCategory: 'Thương mại điện tử & Phân phối trực tuyến',
      address: 'Kho Tổng Logistics Tân Bình, TP.HCM & Online Hub',
      region: 'Kênh Online',
      province: 'TP.HCM',
      timezone: 'Asia/Ho_Chi_Minh',
      coordinates: { lat: 10.8012, lng: 106.6543 },
      phone: '1800 8899',
      website: 'https://techzone.vn',
      bookingUrl: '',
      description: 'Kênh phân phối trực tuyến toàn quốc.',
      regularHours: {
        mon: '08:00 - 22:00',
        tue: '08:00 - 22:00',
        wed: '08:00 - 22:00',
        thu: '08:00 - 22:00',
        fri: '08:00 - 22:00',
        sat: '08:00 - 22:00',
        sun: '08:00 - 22:00'
      },
      specialHours: [],
      attributes: ['Hỗ trợ 24/7 online', 'Giao hàng hỏa tốc 2h'],
      services: ['Giao hàng tận nơi'],
      media: {
        logo: '',
        cover: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800',
        interior: [],
        exterior: []
      },
      placeId: 'ChIJtz_ecom_fake_place_id',
      cid: '108512398234871243',
      googleAccountId: 'accounts/108923412348',
      groups: ['Khu vực TP.HCM', 'Kênh Online / E-com'],
      manager: 'Điều phối Giao vận - Trần Quốc',
      ownership: 'managed',
      businessStatus: 'OPEN',
      connectionStatus: 'connected',
      internalStatus: 'active',
      source: 'gbp',
      lastSyncedAt: '2026-10-15T09:00:00Z',
      googleRating: 4.60,
      googleTotalReviews: 180,
      performance: {
        searchImpressions: 32000,
        callClicks: 650,
        directionRequests: 140,
        websiteClicks: 5800,
        searchQueries: [
          { query: 'techzone online mua sắm', count: 4200 },
          { query: 'bảo hành techzone', count: 1850 }
        ]
      }
    }
  ];

  D.locations = SHARED_LOCATIONS;
  window.SHARED_LOCATIONS = SHARED_LOCATIONS;
  // Lưu trữ cảnh báo Watchlist có thể cập nhật trạng thái & lưu bền vững theo brand
  var SHARED_SMART_GROUPS = {
    'seoul-center': {},
    'golden-hotpot': {},
    'techzone-store': {},
    'jivi-clinic': {}
  };

  function loadPersistedDraft(brandKey, locId) {
    try {
      if (typeof localStorage !== 'undefined') {
        var raw = localStorage.getItem('checkbrand_draft_' + brandKey + '_' + locId);
        if (raw) return JSON.parse(raw);
      }
    } catch (e) { }
    return null;
  }
  window.loadPersistedDraft = loadPersistedDraft;

  function persistDraft(brandKey, locId, draftObj) {
    try {
      if (typeof localStorage !== 'undefined') {
        if (draftObj) {
          localStorage.setItem('checkbrand_draft_' + brandKey + '_' + locId, JSON.stringify(draftObj));
        } else {
          localStorage.removeItem('checkbrand_draft_' + brandKey + '_' + locId);
        }
      }
    } catch (e) { }
  }
  window.persistDraft = persistDraft;

  // Danh sách các trường hồ sơ công khai được phép ghi đè (không bao gồm profileDraft / draft / googleSyncStatus)
  var ALLOWED_PUBLIC_PROFILE_FIELDS = [
    'displayName', 'category', 'primaryCategory', 'address', 'phone', 'website',
    'bookingUrl', 'description', 'regularHours', 'specialHours', 'attributes',
    'services', 'lastSyncedAt'
  ];
  window.ALLOWED_PUBLIC_PROFILE_FIELDS = ALLOWED_PUBLIC_PROFILE_FIELDS;

  function migrateReservedGroupId(id) {
    if (!id) return 'grp_smart_' + Date.now();
    var isReserved = id === 'grp_all' || id === 'all' || id === 'new' || String(id).indexOf('grp_reg_') === 0;
    if (!isReserved) return id;
    return 'grp_smart_migrated_' + String(id).replace(/[^a-zA-Z0-9_]/g, '_');
  }
  window.migrateReservedGroupId = migrateReservedGroupId;

  function loadPersistedSmartGroups() {
    try {
      if (typeof localStorage !== 'undefined') {
        // Duyệt cả SHARED_SMART_GROUPS và mọi key checkbrand_smart_groups_* trong localStorage
        var brandKeys = Object.keys(SHARED_SMART_GROUPS);
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf('checkbrand_smart_groups_') === 0) {
            var bName = k.replace('checkbrand_smart_groups_', '');
            if (!brandKeys.includes(bName)) brandKeys.push(bName);
          }
        }

        brandKeys.forEach(function (bk) {
          SHARED_SMART_GROUPS[bk] = SHARED_SMART_GROUPS[bk] || {};
          var raw = localStorage.getItem('checkbrand_smart_groups_' + bk);
          if (raw) {
            try {
              var parsed = JSON.parse(raw);
              if (parsed && typeof parsed === 'object') {
                var cleanDict = {};
                var needsResave = false;

                Object.keys(parsed).forEach(function (gid) {
                  var grp = parsed[gid];
                  if (!grp || typeof grp !== 'object') return;
                  var isReserved = gid === 'grp_all' || gid === 'all' || gid === 'new' || String(gid).indexOf('grp_reg_') === 0;
                  if (isReserved) {
                    // CHUYỂN ĐỔI ID BẢO LƯU SANG ID SMART ĐỘC LẬP
                    var newId = migrateReservedGroupId(gid);
                    grp.id = newId;
                    if (!grp.name || grp.name === gid || grp.name.indexOf('Toàn bộ chi nhánh') === 0) {
                      grp.name = 'Nhóm Smart Tự Động (Chuyển đổi từ ' + gid + ')';
                    }
                    cleanDict[newId] = grp;
                    needsResave = true;
                  } else {
                    cleanDict[gid] = grp;
                  }
                });

                // Xóa triệt để các ID tĩnh trùng lặp khỏi SHARED_SMART_GROUPS
                delete SHARED_SMART_GROUPS[bk]['grp_all'];
                delete SHARED_SMART_GROUPS[bk]['all'];
                Object.keys(SHARED_SMART_GROUPS[bk]).forEach(function (k) {
                  if (String(k).indexOf('grp_reg_') === 0) delete SHARED_SMART_GROUPS[bk][k];
                });

                SHARED_SMART_GROUPS[bk] = Object.assign({}, SHARED_SMART_GROUPS[bk], cleanDict);

                if (needsResave) {
                  localStorage.setItem('checkbrand_smart_groups_' + bk, JSON.stringify(cleanDict));
                }
              }
            } catch (e) { }
          }
        });
      }
    } catch (e) { }
  }
  loadPersistedSmartGroups();
  window.SHARED_SMART_GROUPS = SHARED_SMART_GROUPS;
  window.loadPersistedSmartGroups = loadPersistedSmartGroups;

  function persistSmartGroupsForBrand(brandKey) {
    try {
      if (typeof localStorage !== 'undefined' && SHARED_SMART_GROUPS[brandKey]) {
        localStorage.setItem('checkbrand_smart_groups_' + brandKey, JSON.stringify(SHARED_SMART_GROUPS[brandKey]));
      }
    } catch (e) { }
  }
  window.persistSmartGroupsForBrand = persistSmartGroupsForBrand;

  function persistLocationProfile(brandKey, locationId, locData) {
    try {
      if (typeof localStorage !== 'undefined' && locData) {
        var storeKey = 'checkbrand_location_overrides_' + brandKey;
        var raw = localStorage.getItem(storeKey);
        var overrides = raw ? JSON.parse(raw) : {};

        // CHỈ LƯU CÁC TRƯỜNG HỒ SƠ CÔNG KHAI ĐƯỢC PHÉP CẬP NHẬT
        // TUYỆT ĐỐI TÁCH profileDraft VÀ TRẠNG THÁI NHÁP KHỎI OVERRIDES
        var clean = {};
        ALLOWED_PUBLIC_PROFILE_FIELDS.forEach(function (k) {
          if (locData[k] !== undefined) {
            clean[k] = locData[k];
          }
        });
        overrides[locationId] = Object.assign({}, overrides[locationId] || {}, clean);
        delete overrides[locationId].profileDraft;
        delete overrides[locationId].draft;
        delete overrides[locationId].googleSyncStatus;

        localStorage.setItem(storeKey, JSON.stringify(overrides));
      }
    } catch (e) { }
  }
  window.persistLocationProfile = persistLocationProfile;

  function loadPersistedLocationOverrides() {
    try {
      if (typeof localStorage !== 'undefined') {
        ['seoul-center', 'golden-hotpot', 'techzone-store', 'jivi-clinic'].forEach(function (bk) {
          var raw = localStorage.getItem('checkbrand_location_overrides_' + bk);
          if (raw) {
            try {
              var overrides = JSON.parse(raw);
              Object.keys(overrides).forEach(function (locId) {
                var loc = SHARED_LOCATIONS.find(function (l) { return l.locationId === locId; });
                if (loc && overrides[locId]) {
                  ALLOWED_PUBLIC_PROFILE_FIELDS.forEach(function (k) {
                    if (overrides[locId][k] !== undefined) {
                      loc[k] = overrides[locId][k];
                    }
                  });
                }
              });
            } catch (e) { }
          }
        });
      }
    } catch (e) { }
  }
  // Khởi tạo: Nạp hồ sơ gốc/override trước...
  loadPersistedLocationOverrides();
  window.loadPersistedLocationOverrides = loadPersistedLocationOverrides;

  // ...Sau đó nạp nháp mới nhất từ localStorage chồng lên
  function rehydrateAllDrafts() {
    try {
      if (typeof localStorage !== 'undefined') {
        SHARED_LOCATIONS.forEach(function (loc) {
          var draft = loadPersistedDraft(loc.brandId, loc.locationId);
          if (draft) {
            loc.profileDraft = draft;
            loc.googleSyncStatus = 'draft_pending';
          }
        });
      }
    } catch (e) { }
  }
  rehydrateAllDrafts();
  window.rehydrateAllDrafts = rehydrateAllDrafts;

  var SHARED_ALERTS = {
    'seoul-center': [
      { id: 'alt_01', severity: 'high', priority: 'CRITICAL', triggerType: 'negative_spike', title: 'Tăng đột biến review tiêu cực tại chi nhánh Bình Thạnh', location: 'Seoul Center - Bình Thạnh', scope: 'loc_sc_binh_thanh', evidence: 'Xuất hiện 2 review 1★ trong 48h về tư vấn và dịch vụ', assignee: 'BS. CKII Nguyễn Minh Trang', status: 'in_progress', ruleId: 'RUL-NEG-SPIKE', detectedAt: '2026-10-14T10:15:00Z' },
      { id: 'alt_02', severity: 'high', priority: 'HIGH', triggerType: 'sla_overdue', title: 'Quá hạn SLA phản hồi khách hàng (10 vụ việc)', location: 'Toàn mạng lưới', scope: 'brand_wide', evidence: 'SLA tối đa 24h đối với review tiêu cực', assignee: 'Trưởng phòng CSKH', status: 'new', ruleId: 'RUL-SLA-24H', detectedAt: '2026-10-15T08:00:00Z' },
      { id: 'alt_03', severity: 'medium', priority: 'MEDIUM', triggerType: 'profile_incomplete', title: 'Chi nhánh Tân Bình: Cần bổ sung liên kết booking và mô tả đầy đủ', location: 'Seoul Center - Tân Bình', scope: 'loc_sc_tan_binh', evidence: 'Mức hoàn thiện hồ sơ đạt 88% (dưới ngưỡng 90%)', assignee: 'QLCN - Hoàng Oanh', status: 'new', ruleId: 'RUL-PROFILE-COMP', detectedAt: '2026-10-15T07:30:00Z' },
      { id: 'alt_04', severity: 'medium', priority: 'MEDIUM', triggerType: 'dispatch_failed', title: 'Xuất bản bài đăng thất bại tại 1 chi nhánh do ảnh sai tỷ lệ', location: 'Seoul Center - Tân Bình', scope: 'loc_sc_tan_binh', evidence: 'Mã lỗi ERR_IMAGE_DIMENSIONS khi truyền qua GBP API', assignee: 'Marketing Lead', status: 'seen', ruleId: 'RUL-POST-FAIL', detectedAt: '2026-10-15T09:00:00Z' }
    ],
    'golden-hotpot': [
      { id: 'alt_gh_01', severity: 'high', priority: 'CRITICAL', triggerType: 'negative_spike', title: 'Phản ánh chất lượng nước lẩu và phục vụ tại chi nhánh Bùi Viện', location: 'Golden Hotpot - Bùi Viện', scope: 'loc_gh_q1', evidence: '1 review 1★ phản ánh nước lẩu nguội và gọi nhân viên không phản hồi', assignee: 'Bếp trưởng - Nguyễn Văn Kiên', status: 'new', ruleId: 'RUL-FOOD-RISK', detectedAt: '2026-10-15T11:00:00Z' },
      { id: 'alt_gh_02', severity: 'medium', priority: 'HIGH', triggerType: 'sla_overdue', title: 'Nhắc việc: 2 review chưa phản hồi trên Google Maps', location: 'Chi nhánh Sư Vạn Hạnh', scope: 'loc_gh_q10', evidence: 'Thời gian chưa phản hồi: 18 giờ', assignee: 'QL Đặng Thu Thảo', status: 'seen', ruleId: 'RUL-SLA-12H', detectedAt: '2026-10-15T12:00:00Z' }
    ],
    'techzone-store': [
      { id: 'alt_tz_01', severity: 'high', priority: 'HIGH', triggerType: 'negative_spike', title: 'Phản ánh tiến độ giao hàng kênh Online E-com', location: 'TechZone - Online Hub', scope: 'loc_tz_ecom', evidence: 'Phản ánh đơn hàng trễ 5 ngày và hộp móp méo', assignee: 'Điều phối Giao vận', status: 'in_progress', ruleId: 'RUL-SHIP-DELAY', detectedAt: '2026-10-15T09:30:00Z' }
    ],
    'jivi-clinic': [
      { id: 'alt_jv_01', severity: 'medium', priority: 'MEDIUM', triggerType: 'rating_drop', title: 'Theo dõi chỉ số hài lòng khách hàng sau điều trị mụn', location: 'JIVI Clinic - Phan Xích Long', scope: 'loc_jivi_pn', evidence: 'Rating duy trì ổn định 4.88 ★', assignee: 'BS. Phan Hà Lan', status: 'seen', ruleId: 'RUL-CSAT-STABLE', detectedAt: '2026-10-15T08:00:00Z' }
    ]
  };
  window.SHARED_ALERTS = SHARED_ALERTS;

  function loadPersistedAlerts() {
    try {
      if (typeof localStorage !== 'undefined') {
        Object.keys(SHARED_ALERTS).forEach(function (bk) {
          var raw = localStorage.getItem('checkbrand_alerts_' + bk);
          if (raw) {
            try {
              var savedList = JSON.parse(raw);
              if (Array.isArray(savedList)) {
                var currList = SHARED_ALERTS[bk] || [];
                savedList.forEach(function (saved) {
                  var match = currList.find(function (c) { return c.id === saved.id; });
                  if (match) {
                    match.status = saved.status;
                    if (saved.updatedAt) match.updatedAt = saved.updatedAt;
                  }
                });
              }
            } catch (e) { }
          }
        });
      }
    } catch (e) { }
  }
  loadPersistedAlerts();
  window.loadPersistedAlerts = loadPersistedAlerts;

  function persistAlertsForBrand(brandKey) {
    try {
      if (typeof localStorage !== 'undefined' && SHARED_ALERTS[brandKey]) {
        localStorage.setItem('checkbrand_alerts_' + brandKey, JSON.stringify(SHARED_ALERTS[brandKey]));
      }
    } catch (e) { }
  }
  window.persistAlertsForBrand = persistAlertsForBrand;

  function isLocationConnected(loc) {
    if (!loc) return false;
    var st = loc.connectionStatus || loc.googleConnectionStatus;
    if (st === 'disconnected') return false;
    if (st === 'pending') return false;
    if (st === 'connected') return true;
    return false;
  }
  window.isLocationConnected = isLocationConnected;

  function isLocationOpen(loc) {
    if (!loc) return false;
    var bs = String(loc.businessStatus || '').toUpperCase();
    return bs === 'OPEN' || bs === 'OPERATIONAL';
  }
  window.isLocationOpen = isLocationOpen;

  function getBrandLocations(brandId) {
    // Tránh ghi đè trạng thái đang sửa mỗi lần đọc danh sách địa điểm
    if (!brandId || brandId === 'all') return SHARED_LOCATIONS;
    return SHARED_LOCATIONS.filter(function (loc) { return loc.brandId === brandId; });
  }
  window.getBrandLocations = getBrandLocations;

  /* =========================================================================
     CHUẨN HÓA NGUỒN REVIEW & KIỂM TRA PHẢN HỒI (FIX B3, B4)
     Phân biệt rõ:
     - Nhà cung cấp dữ liệu: SerpApi, Google Places API, Google Business Profile API
     - Loại nguồn nội dung: google_review, web_mention, social_post, unknown
     ========================================================================= */
  function normalizeSource(r) {
    if (!r) return { sourceType: 'unknown', provider: 'unknown', label: 'Không xác định', isGoogleReview: false };
    var rawSource = (r.source || r.src || '').toLowerCase();
    var provider = r.provider || (rawSource === 'serpapi' ? 'SerpApi' : (rawSource === 'places_api' ? 'Google Places API' : (rawSource === 'gbp' ? 'Google Business Profile' : (rawSource === 'google' ? 'Google' : (r.source || r.src || 'Chưa rõ')))));
    var url = (r.url || r.sourceUrl || '').toLowerCase();
    var sourceType = 'unknown';

    if (rawSource === 'google' || rawSource === 'google_maps' || rawSource === 'google_places' || rawSource === 'gmb' || rawSource === 'serpapi' || (url && (url.includes('google.com/maps') || url.includes('goo.gl/maps')) && r.rating != null)) {
      sourceType = 'google_review';
    } else if (rawSource === 'google_news' || rawSource === 'news' || rawSource === 'mention' || rawSource === 'press' || (r.rating == null && url && !url.includes('/maps/'))) {
      sourceType = 'web_mention';
    } else if (rawSource === 'facebook' || rawSource === 'tiktok' || rawSource === 'social') {
      sourceType = 'social_post';
    } else if (r.rating != null && (rawSource.includes('google') || (r.id && r.id.startsWith('self|0x')))) {
      sourceType = 'google_review';
    } else if (!rawSource && !url) {
      sourceType = 'unknown';
    }

    var isGoogle = (sourceType === 'google_review');
    var label = isGoogle ? 'Google Review' : (sourceType === 'web_mention' ? 'Báo chí / Web' : (sourceType === 'social_post' ? 'Mạng xã hội' : 'Nguồn chưa xác định'));

    return {
      sourceType: sourceType,
      provider: provider,
      label: label,
      isGoogleReview: isGoogle
    };
  }
  window.normalizeSource = normalizeSource;

  function isGoogleReview(r) {
    return normalizeSource(r).isGoogleReview;
  }
  window.isGoogleReview = isGoogleReview;

  function isUnrepliedGoogleReview(r) {
    if (!isGoogleReview(r)) return false;
    if (r.replyUnknown) return false; // chưa kiểm tra trạng thái phản hồi → không tính là chưa phản hồi
    // Chưa có phản hồi công khai xuất bản trên Google
    // Lưu ý: r.replyStatus === 'draft' hoặc 'approved' là nội bộ, chưa phải Google xuất bản
    var hasPublicReply = Boolean(r.reply && r.reply.text && r.reply.text.trim().length > 0 && r.replyStatus !== 'draft' && r.replyStatus !== 'approved');
    return !hasPublicReply;
  }
  window.isUnrepliedGoogleReview = isUnrepliedGoogleReview;

  // Phục hồi & Khởi tạo quy trình vận hành review
  (function initReviewWorkflows() {
    var SNAPSHOT_TIME = CB_CONFIG.SNAPSHOT_TIME;
    // LIVE: review thật – không gắn ảnh mẫu / trạng thái xử lý giả; trạng thái lấy từ server (CB_WORKFLOW)
    var LIVE = CB_CONFIG.MODE === 'live';
    var SERVER_WF = (LIVE && window.CB_WORKFLOW) || {};

    for (var bId in D.rev) {
      var p = D.rev[bId].pool || [];
      var bConfig = getBrandConfig(bId);
      var indPack = getIndustryPack(bConfig.industry);
      var staffList = bConfig.staff || [];
      var brandLocs = getBrandLocations(bId);

      p.forEach(function (r, idx) {
        var saved = null;
        if (LIVE) {
          saved = SERVER_WF[r.id] || null;
        } else {
          try {
            var sStr = localStorage.getItem('cb_wf_' + r.id);
            if (sStr) saved = JSON.parse(sStr);
          } catch (e) { }
        }
        // LIVE: review lấy về trước khi hệ thống theo dõi phản hồi → chưa biết đã trả lời hay chưa
        r.replyUnknown = LIVE && !('reply' in r) && !(saved && saved.reply);

        var isNeg = (r.rating != null && r.rating <= 2) || (r.analysis && r.analysis.sentiment === 'negative');
        if (!r.source) {
          r.source = (r.rating != null) ? 'google' : 'google_news';
        }

        // Gắn kết chặt chẽ với locationId trong danh mục dùng chung
        if (brandLocs.length > 0) {
          var matchingLoc = brandLocs.find(function (loc) {
            return (r.branch && loc.fullName === r.branch) || (r.branch && loc.fullName.includes(r.branch)) || (r.branch && r.branch.includes(loc.region));
          }) || brandLocs[idx % brandLocs.length];
          r.locationId = matchingLoc.locationId;
        }

        // Định nghĩa rõ các nhóm loại trừ nhau cho review media & nội dung (Fix Part F)
        var hasRealText = Boolean(r.text && r.text.trim().length > 0);
        r.hasText = hasRealText;

        // Cung cấp media review chân thực cho bản demo (khoảng 30% review có ảnh)
        if (!LIVE && idx % 3 === 0 && hasRealText && r.rating != null) {
          r.photos = r.photos || ['https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&auto=format&fit=crop&q=60'];
          r.hasPhoto = true;
        } else {
          r.hasPhoto = Boolean(r.photos && r.photos.length > 0);
        }

        // Nhóm phân loại loại trừ: 'photo' | 'text_only' | 'rating_only' | 'unknown_media'
        if (r.hasPhoto) {
          r.mediaCategory = 'photo';
        } else if (r.hasText) {
          r.mediaCategory = 'text_only';
        } else {
          r.mediaCategory = 'rating_only';
        }

        // Trạng thái theo dõi biến động review (Fix F2)
        // 'observed' | 'suspected_missing' | 'confirmed_unavailable' | 'restored'
        r.missingStatus = (saved && saved.missingStatus) || r.missingStatus || 'observed';
        r.firstSeenAt = r.firstSeenAt || r.fetchedAt || '2026-10-01T08:00:00Z';
        r.lastSeenAt = r.lastSeenAt || r.replyCheckedAt || r.fetchedAt || '2026-10-15T09:00:00Z';

        // Phân công nhân sự theo chi nhánh / phòng ban
        var defaultStaff = 'Chưa phân công';
        if (isNeg && staffList.length > 0) {
          var matchingStaff = staffList.find(function (st) {
            return r.branch && st.indexOf(r.branch.split(' - ')[1] || r.branch) !== -1;
          });
          defaultStaff = matchingStaff || staffList[0];
        }

        if (saved && saved.reply) {
          r.reply = saved.reply;
        }
        r.assignee = (saved && saved.assignee) || (isNeg ? defaultStaff : 'Chưa phân công');
        if (LIVE) {
          // Mặc định theo dữ liệu thật: review tiêu cực chưa có phản hồi → 'new', còn lại coi như đã xong
          r.ticketStatus = (saved && saved.ticketStatus) || (isNeg && !r.reply && !r.replyUnknown ? 'new' : 'resolved');
          r.replyStatus = (saved && saved.replyStatus) || (r.reply ? 'published' : 'none');
          if (saved && saved.draftReply !== undefined) r.draftReply = saved.draftReply;
          if (saved && saved.internalNotes) r.internalNotes = saved.internalNotes;
          if (saved && saved.history) r.history = saved.history;
        } else {
          r.ticketStatus = (saved && saved.ticketStatus) || (isNeg ? (idx === 0 ? 'in_progress' : (idx === 1 ? 'assigned' : (idx < 5 ? 'resolved' : 'new'))) : 'resolved');
          r.replyStatus = (saved && saved.replyStatus) || (r.reply ? 'published' : (isNeg ? (idx === 0 ? 'draft' : (idx === 1 ? 'approved' : 'none')) : 'none'));
        }
        r.approvedReplyText = (saved && saved.approvedReplyText) || (r.replyStatus === 'approved' ? (saved && saved.draftReply) : null);

        // Tính toán SLA ĐỘNG
        var revDate = new Date(r.date || '2026-10-01T00:00:00Z').getTime();
        r.deadline = (saved && saved.deadline) || new Date(revDate + (isNeg ? 24 * 3600 * 1000 : 48 * 3600 * 1000)).toISOString();
        var isPastDeadline = SNAPSHOT_TIME > new Date(r.deadline).getTime();
        r.slaOverdue = (r.ticketStatus !== 'resolved') && isPastDeadline;

        // Phục hồi đối tượng reply
        if (r.replyStatus === 'published' && !r.reply) {
          var replyTxt = (saved && saved.draftReply) || r.draftReply || ('Kính gửi quý khách, ' + bConfig.name + ' chân thành cảm ơn đánh giá của quý khách.');
          r.reply = {
            text: replyTxt,
            date: (saved && saved.deadline) || r.date || new Date().toISOString(),
            isSimulated: true
          };
        }
      });
    }
  })();

  /* =========================================================================
     DỊCH VỤ TÍNH BRAND HEALTH CHUẨN HÓA (FIX B1, B2)
     - Dùng chung một công thức duy nhất cho Sidebar, Overview, Branches, Reports
     - Không fallback 90, 100, 5★ khi thiếu dữ liệu
     - Kiểm tra điều kiện mẫu tối thiểu
     - Không lấy hiện diện kỳ này để tính điểm kỳ trước
     - Điểm 0 hiển thị rõ 0
     ========================================================================= */
  function calcBrandHealth(pool, bConfig, days) {
    var refTime = CB_CONFIG.SNAPSHOT_TIME;
    var cutoff = days ? refTime - days * 864e5 : 0;

    var periodRevs = (pool || []).filter(function (r) {
      if (!days) return true;
      return new Date(r.date || '2026-10-01').getTime() >= cutoff;
    });

    var total = periodRevs.length;
    var ratedRevs = periodRevs.filter(function (r) { return r.rating != null && r.rating >= 1 && r.rating <= 5; });
    var ratingCount = ratedRevs.length;
    var avgRating = ratingCount > 0 ? (ratedRevs.reduce(function (s, r) { return s + r.rating; }, 0) / ratingCount) : null;

    var posCount = periodRevs.filter(function (r) {
      return (r.rating != null && r.rating >= 4) || (r.rating == null && r.analysis && r.analysis.sentiment === 'positive');
    }).length;

    var negCount = periodRevs.filter(function (r) {
      return (r.rating != null && r.rating <= 2) || (r.rating == null && r.analysis && r.analysis.sentiment === 'negative');
    }).length;

    var mentionCount = periodRevs.filter(function (r) { return r.rating == null; }).length;

    var cRating = {
      key: 'rating',
      label: 'Điểm sao trung bình',
      weight: 0.35,
      value: avgRating != null ? Math.round(avgRating * 20) : null,
      status: avgRating != null ? 'available' : 'missing',
      note: ratingCount > 0 ? (ratingCount + ' review có sao') : 'Chưa có review có sao trong kỳ'
    };

    var cSentiment = {
      key: 'sentiment',
      label: 'Cảm xúc tích cực',
      weight: 0.25,
      value: total > 0 ? Math.round((posCount / total) * 100) : null,
      status: total > 0 ? 'available' : 'missing',
      note: total > 0 ? (posCount + '/' + total + ' tích cực') : 'Chưa có dữ liệu phản hồi'
    };

    var cRisk = {
      key: 'risk',
      label: 'Mức độ an toàn thương hiệu',
      weight: 0.25,
      value: total > 0 ? Math.max(0, Math.round((1 - negCount / total) * 100)) : null,
      status: total > 0 ? 'available' : 'missing',
      note: total > 0 ? (negCount + '/' + total + ' tiêu cực') : 'Chưa có dữ liệu rủi ro'
    };

    var cSovVal = null;
    var cSovNote = '';
    if (bConfig && bConfig.sov != null) {
      cSovVal = bConfig.sov;
      cSovNote = bConfig.sovNote || 'Cấu hình thương hiệu';
    } else if (total > 0) {
      cSovVal = Math.min(100, Math.round(65 + Math.min(25, total * 2) + (mentionCount > 0 ? 10 : 0)));
      cSovNote = 'Ước tính từ độ phủ thực tế (' + total + ' bản ghi - proxy, không phải Share of Voice đo lường toàn thị trường)';
    } else {
      cSovNote = 'Chưa có dữ liệu hiện diện';
    }

    var cSov = {
      key: 'sov',
      label: 'Hiện diện truyền thông',
      weight: 0.15,
      value: cSovVal,
      status: cSovVal != null ? 'available' : 'missing',
      note: cSovNote
    };

    var comps = [cRating, cSentiment, cRisk, cSov];
    var availableComps = comps.filter(function (c) { return c.value != null; });
    var missingComps = comps.filter(function (c) { return c.value == null; });
    var sumAvailableWeight = availableComps.reduce(function (sum, c) { return sum + c.weight; }, 0);

    var score = null;
    var calcNote = '';

    // ĐIỀU KIỆN MẪU TỐI THIỂU: Bỏ mọi fallback 90, 100 điểm khi thiếu dữ liệu
    if (total === 0 || availableComps.length === 0) {
      score = null;
      calcNote = 'Chưa đủ dữ liệu';
    } else if (total < 3) {
      score = null;
      calcNote = 'Chưa đủ dữ liệu tối thiểu (yêu cầu tối thiểu 3 bản ghi trong kỳ, hiện có ' + total + ')';
    } else if (availableComps.length === comps.length) {
      score = Math.round(comps.reduce(function (sum, c) { return sum + c.value * c.weight; }, 0));
      calcNote = 'Tính từ 4 thành phần theo đúng trọng số đang hiển thị';
    } else {
      if (sumAvailableWeight >= 0.5) {
        score = Math.round(availableComps.reduce(function (sum, c) {
          return sum + c.value * (c.weight / sumAvailableWeight);
        }, 0));
        calcNote = 'Chuẩn hóa trên ' + availableComps.length + ' thành phần có dữ liệu (tổng trọng số gốc ' + Math.round(sumAvailableWeight * 100) + '%). Thiếu: ' + missingComps.map(function (c) { return c.label; }).join(', ');
      } else {
        score = null;
        calcNote = 'Chưa đủ dữ liệu tối thiểu (thiếu: ' + missingComps.map(function (c) { return c.label; }).join(', ') + ')';
      }
    }

    // TÍNH TOÁN KỲ TRƯỚC: Không lấy hiện diện kỳ này tính cho kỳ trước!
    var prevCutoff = days ? cutoff - days * 864e5 : 0;
    var prevRevs = (pool || []).filter(function (r) {
      if (!days) return false;
      var t = new Date(r.date || '2026-10-01').getTime();
      return t >= prevCutoff && t < cutoff;
    });

    var prevHealth = null;
    var deltaHealth = null;

    if (prevRevs.length >= 3 && score != null) {
      var prevRated = prevRevs.filter(function (r) { return r.rating != null && r.rating >= 1 && r.rating <= 5; });
      var prevRatingCount = prevRated.length;
      var prevAvg = prevRatingCount > 0 ? (prevRated.reduce(function (s, r) { return s + r.rating; }, 0) / prevRatingCount) : null;
      var prevPos = prevRevs.filter(function (r) { return (r.rating != null && r.rating >= 4) || (r.rating == null && r.analysis && r.analysis.sentiment === 'positive'); }).length;
      var prevNeg = prevRevs.filter(function (r) { return (r.rating != null && r.rating <= 2) || (r.rating == null && r.analysis && r.analysis.sentiment === 'negative'); }).length;
      var prevMentionCount = prevRevs.filter(function (r) { return r.rating == null; }).length;

      // Thành phần SOV kỳ trước tính RIÊNG từ quy mô của chính kỳ trước
      var prevCSov = null;
      if (bConfig && bConfig.sov != null) {
        prevCSov = bConfig.sov;
      } else if (prevRevs.length > 0) {
        prevCSov = Math.min(100, Math.round(65 + Math.min(25, prevRevs.length * 2) + (prevMentionCount > 0 ? 10 : 0)));
      }

      if (prevRatingCount > 0 && prevCSov != null) {
        var prevCRating = Math.round(prevAvg * 20);
        var prevCSentiment = Math.round((prevPos / prevRevs.length) * 100);
        var prevCRisk = Math.max(0, Math.round((1 - prevNeg / prevRevs.length) * 100));
        prevHealth = Math.round(prevCRating * 0.35 + prevCSentiment * 0.25 + prevCRisk * 0.25 + prevCSov * 0.15);
        deltaHealth = score - prevHealth;
      }
    }

    return {
      score: score,
      displayScore: score != null ? score : 'Chưa đủ dữ liệu',
      avgRating: avgRating,
      kpi: { avgRating: avgRating },
      components: comps,
      availableCount: availableComps.length,
      missingCount: missingComps.length,
      note: calcNote,
      prev: prevHealth,
      delta: deltaHealth,
      periodComparisonText: prevHealth != null ? ('so với cùng kỳ trước (' + days + ' ngày trước)') : 'chưa đủ dữ liệu kỳ trước'
    };
  }
  window.calcBrandHealth = calcBrandHealth;
  /* =========================================================================
     NHÓM CHỈ SỐ B: MỨC HOÀN THIỆN HỒ SƠ (PROFILE COMPLETENESS) - YÊU CẦU 1 & 3
     Quy tắc:
     - Gọi đúng là "Mức hoàn thiện hồ sơ", không dùng chung tên Health Score
     - Chỉ tính trên các trường áp dụng cho loại hình cơ sở
     - Trường không áp dụng không bị trừ điểm
     - Trường nguồn chưa cung cấp là "chưa xác định" (unknown), không tự tính thiếu
     ========================================================================= */
  function calcProfileCompleteness(loc, industry) {
    if (!loc || !loc.locationId) return { percentage: null, completenessScore: null, displayPercentage: 'Chưa đủ dữ liệu', completedCount: null, applicableCount: 0, evaluatedCount: 0, unknownCount: 0, missingCount: 0, missingFields: [], details: [] };

    var ind = loc.industry || industry || 'generic';
    var isClinicOrRestaurant = (ind === 'aesthetic_clinic' || ind === 'f_and_b');

    var fieldDefs = [
      { key: 'displayName', label: 'Tên địa điểm', applicable: true, check: function (l) { return Boolean(l.displayName); } },
      { key: 'address', label: 'Địa chỉ chi tiết', applicable: true, check: function (l) { return Boolean(l.address && l.address.length >= 10); } },
      { key: 'primaryCategory', label: 'Danh mục chính', applicable: true, check: function (l) { return Boolean(l.primaryCategory); } },
      { key: 'phone', label: 'Số điện thoại liên hệ', applicable: true, check: function (l) { return Boolean(l.phone); } },
      { key: 'website', label: 'Website chính thức', applicable: true, check: function (l) { return Boolean(l.website); } },
      { key: 'regularHours', label: 'Giờ mở cửa hàng ngày', applicable: true, check: function (l) { return Boolean(l.regularHours && Object.keys(l.regularHours).length >= 5); } },
      { key: 'description', label: 'Mô tả giới thiệu', applicable: true, check: function (l) { return Boolean(l.description && l.description.length >= 25); } },
      { key: 'coverPhoto', label: 'Ảnh bìa (Cover Photo)', applicable: true, check: function (l) { return Boolean(l.coverPhoto || (l.media && l.media.cover)); } },
      { key: 'logoPhoto', label: 'Ảnh đại diện / Logo', applicable: true, check: function (l) { return Boolean(l.logoPhoto || (l.media && l.media.logo)); } },
      { key: 'interiorPhotos', label: 'Ảnh không gian bên trong', applicable: true, check: function (l) { return Boolean((l.interiorPhotos && l.interiorPhotos.length) || (l.media && l.media.interior && l.media.interior.length)); } },
      { key: 'exteriorPhotos', label: 'Ảnh mặt tiền / ngoại thất', applicable: true, check: function (l) { return Boolean((l.exteriorPhotos && l.exteriorPhotos.length) || (l.media && l.media.exterior && l.media.exterior.length)); } },
      { key: 'bookingUrl', label: 'Liên kết đặt hẹn / Booking', applicable: isClinicOrRestaurant, check: function (l) { return Boolean(l.bookingUrl); } },
      { key: 'serviceArea', label: 'Vùng phục vụ (Giao hàng/Di động)', applicable: Boolean(loc.isServiceAreaBusiness), check: function (l) { return Boolean(l.serviceArea && l.serviceArea.length); } },
      { key: 'attributes', label: 'Thuộc tính tiện ích', applicable: true, check: function (l) { return Boolean(l.attributes && l.attributes.length > 0); } }
    ];

    var applicableDefs = fieldDefs.filter(function (f) { return f.applicable; });
    var completedCount = 0;
    var unknownCount = 0;
    var missingFields = [];
    var details = [];

    for (var i = 0; i < applicableDefs.length; i++) {
      var def = applicableDefs[i];
      var rawVal = loc[def.key];
      if (rawVal === undefined && (!loc.media || loc.media[def.key] === undefined)) {
        unknownCount++;
        details.push({ key: def.key, label: def.label, status: 'unknown', text: 'Chưa xác định từ nguồn' });
        continue;
      }

      var isOk = def.check(loc);
      if (isOk) {
        completedCount++;
        details.push({ key: def.key, label: def.label, status: 'completed', text: 'Đã hoàn thiện' });
      } else {
        missingFields.push({ key: def.key, label: def.label });
        details.push({ key: def.key, label: def.label, status: 'missing', text: 'Cần bổ sung' });
      }
    }

    var evaluatedCount = applicableDefs.length - unknownCount;
    var percentage = evaluatedCount > 0 ? Math.round((completedCount / evaluatedCount) * 100) : null;

    return {
      percentage: percentage,
      displayPercentage: percentage != null ? (percentage + '%') : 'Chưa đủ dữ liệu',
      completedCount: completedCount,
      applicableCount: applicableDefs.length,
      evaluatedCount: evaluatedCount,
      unknownCount: unknownCount,
      missingCount: missingFields.length,
      missingFields: missingFields,
      details: details
    };
  }
  window.calcProfileCompleteness = calcProfileCompleteness;

  /* =========================================================================
     NHÓM CHỈ SỐ C: HIỆU QUẢ HIỆN DIỆN VÀ VẬN HÀNH (PRESENCE & PERFORMANCE) - YÊU CẦU 1 & 2
     Phân biệt rõ:
     - Lượt bấm nút gọi (Call Clicks) != Cuộc gọi thực tế đã kết nối
     - Lượt yêu cầu chỉ đường (Directions) != Khách đã đến cơ sở
     - Lượt xem (Impressions) != Người dùng duy nhất (Unique Visitors)
     - Cụm từ tìm kiếm (Search Queries) != Thứ hạng từ khóa địa phương (Local Rank)
     ========================================================================= */
  function calcBrandPerformance(brandId, days) {
    var brandLocs = getBrandLocations(brandId);
    var searchImpressions = brandLocs.reduce(function (s, l) { return s + (l.performance ? l.performance.searchImpressions : 0); }, 0);
    var callClicks = brandLocs.reduce(function (s, l) { return s + (l.performance ? l.performance.callClicks : 0); }, 0);
    var directionRequests = brandLocs.reduce(function (s, l) { return s + (l.performance ? l.performance.directionRequests : 0); }, 0);
    var websiteClicks = brandLocs.reduce(function (s, l) { return s + (l.performance ? l.performance.websiteClicks : 0); }, 0);

    // Tổng hợp top search queries từ các địa điểm
    var queryMap = {};
    brandLocs.forEach(function (l) {
      if (l.performance && l.performance.searchQueries) {
        l.performance.searchQueries.forEach(function (sq) {
          queryMap[sq.query] = (queryMap[sq.query] || 0) + sq.count;
        });
      }
    });

    var searchQueries = Object.keys(queryMap).map(function (q) {
      return { query: q, count: queryMap[q] };
    }).sort(function (a, b) { return b.count - a.count; }).slice(0, 5);

    return {
      searchImpressions: searchImpressions,
      callClicks: callClicks,
      directionRequests: directionRequests,
      websiteClicks: websiteClicks,
      searchQueries: searchQueries,
      postsPublishedCount: 12,
      photosPublishedCount: 28,
      taskResolutionRate: 92,
      sourceName: 'Google Business Profile Performance API',
      sourceDisclaimer: 'Số liệu truy vấn từ Google Performance API. Lượt bấm gọi và yêu cầu chỉ đường là hành vi tương tác trên Maps, không đại diện cho cuộc gọi kết nối thành công hoặc lượt khách thực tế đến cửa hàng.'
    };
  }
  window.calcBrandPerformance = calcBrandPerformance;

  /* =========================================================================
     BỘ ĐIỀU KIỆN SMART GROUP (DYNAMIC GROUPS) - YÊU CẦU 4
     ========================================================================= */
  function evalSmartGroupConditions(loc, conditions, logic) {
    if (!conditions || !conditions.length) return true;
    logic = (logic || 'AND').toUpperCase();

    var results = conditions.map(function (cond) {
      var field = cond.field;
      var op = cond.op || cond.operator;
      var val = cond.value;

      var actual = null;
      if (field === 'googleRating') actual = loc.googleRating;
      else if (field === 'googleTotalReviews') actual = loc.googleTotalReviews;
      else if (field === 'businessStatus') actual = loc.businessStatus;
      else if (field === 'region' || field === 'province') actual = loc.region || loc.province;
      else if (field === 'profileCompleteness') actual = calcProfileCompleteness(loc).percentage;
      else actual = loc[field];

      if (op === '>') return Number(actual) > Number(val);
      if (op === '>=') return Number(actual) >= Number(val);
      if (op === '<') return Number(actual) < Number(val);
      if (op === '<=') return Number(actual) <= Number(val);
      if (op === '=' || op === '==') return String(actual).toLowerCase() === String(val).toLowerCase();
      if (op === '!=') return String(actual).toLowerCase() !== String(val).toLowerCase();
      if (op === 'contains') return String(actual || '').toLowerCase().includes(String(val || '').toLowerCase());
      return true;
    });

    if (logic === 'OR') {
      return results.some(Boolean);
    }
    return results.every(Boolean);
  }
  window.evalSmartGroupConditions = evalSmartGroupConditions;


  function J(o, s) { return new Response(typeof o === 'string' ? o : JSON.stringify(o), { status: s || 200, headers: { 'Content-Type': 'application/json' } }); }

  /* =========================================================================
     MOCK API ROUTER (WINDOW.FETCH INTERCEPTOR)
     ========================================================================= */
  var realFetch = window.fetch.bind(window);
  var mockFetch = async function (u, opt) {
    var url = new URL(typeof u === 'string' ? u : u.url, 'http://demo.local');
    var p = url.pathname;
    if (p.indexOf('/api/') !== 0) return J({}, 404);
    var method = ((opt && opt.method) || 'GET').toUpperCase();

    if (method !== 'GET') {
      try {
        var body = opt && opt.body ? (typeof opt.body === 'string' ? JSON.parse(opt.body) : opt.body) : {};
        var pathParts = p.slice(5).split('/');
        var brandFromPath = pathParts[0];

        // 1. Workflow & Review reply update
        if (p.indexOf('/workflow') !== -1 && body.id) {
          var targetBrand = brandFromPath || body.brandId || S.brand || 'seoul-center';
          var pool = (D.rev[targetBrand] && D.rev[targetBrand].pool) || [];
          var target = pool.find(function (r) { return r.id === body.id; });
          if (target) {
            if (body.ticketStatus) target.ticketStatus = body.ticketStatus;
            if (body.assignee !== undefined) target.assignee = body.assignee;
            if (body.draftReply !== undefined) target.draftReply = body.draftReply;
            if (body.replyStatus !== undefined) target.replyStatus = body.replyStatus;
            if (body.approvedReplyText !== undefined) target.approvedReplyText = body.approvedReplyText;
            if (body.internalNote) {
              target.internalNotes = target.internalNotes || [];
              target.internalNotes.unshift({
                id: 'note_' + Date.now(),
                text: body.internalNote,
                author: body.noteAuthor || 'Quản trị viên',
                createdAt: new Date().toISOString()
              });
            }
            return J({ ok: true, item: target });
          }
        }

        // 2. Location Profile update (Lưu nháp vs Gửi Google API - Tách biệt rõ ràng & Cô lập thương hiệu)
        if (p.includes('/locations/') && p.includes('/profile')) {
          var locParts = p.split('/');
          var targetLocId = locParts[locParts.indexOf('locations') + 1];
          var targetBrand = brandFromPath || body.brandId || S.brand || 'seoul-center';
          var locObj = SHARED_LOCATIONS.find(function (l) { return l.locationId === targetLocId; });
          if (!locObj) return J({ error: 'Không tìm thấy địa điểm', code: 'LOCATION_NOT_FOUND' }, 404);

          // CÔ LẬP THƯƠNG HIỆU: Địa điểm phải thuộc đúng thương hiệu được gọi
          if (locObj.brandId !== targetBrand) {
            return J({
              error: 'Truy cập bị từ chối: Địa điểm không thuộc thương hiệu ' + targetBrand + ' (Brand Isolation Violation)',
              code: 'FORBIDDEN_LOCATION_OWNERSHIP'
            }, 403);
          }

          var action = body.action || 'save_draft'; // 'save_draft' | 'submit_google'
          var updates = body.updates || {};
          var explicitDeletes = body.explicitDeletes || [];

          // Audit diff tracking
          var diffs = [];
          Object.keys(updates).forEach(function (k) {
            diffs.push({ field: k, before: locObj[k], after: updates[k], type: 'update' });
          });
          explicitDeletes.forEach(function (k) {
            diffs.push({ field: k, before: locObj[k], after: null, type: 'delete' });
          });

          if (action === 'submit_google') {
            // Thao tác mới nhất phải thay thế yêu cầu cũ:
            var draftUpdates = (locObj.profileDraft && locObj.profileDraft.updates) || {};
            var draftDeletes = (locObj.profileDraft && locObj.profileDraft.explicitDeletes) || [];
            var bodyUpdates = updates || {};
            var bodyDeletes = explicitDeletes || [];

            // Bắt đầu từ danh sách delete của draft
            var allDeletes = draftDeletes.slice();
            bodyDeletes.forEach(function (k) {
              if (!allDeletes.includes(k)) allDeletes.push(k);
            });

            // NGUYÊN TẮC: Giá trị cập nhật mới nhất PHẢI THAY THẾ yêu cầu xóa cũ!
            // Nếu người dùng nhập website mới (hoặc trường bất kỳ có giá trị), gỡ trường đó khỏi allDeletes!
            Object.keys(bodyUpdates).forEach(function (k) {
              if (bodyUpdates[k] !== undefined && bodyUpdates[k] !== null && String(bodyUpdates[k]).trim() !== '') {
                allDeletes = allDeletes.filter(function (delKey) { return delKey !== k; });
              }
            });

            var finalUpdates = Object.assign({}, draftUpdates, bodyUpdates);
            allDeletes.forEach(function (delKey) {
              delete finalUpdates[delKey];
            });

            Object.keys(finalUpdates).forEach(function (k) {
              locObj[k] = finalUpdates[k];
            });

            allDeletes.forEach(function (k) {
              delete locObj[k];
              locObj[k] = '';
            });

            locObj.lastSyncedAt = new Date().toISOString();
            locObj.googleSyncStatus = 'synced';
            locObj.profileDraft = null;
            if (typeof persistDraft === 'function') persistDraft(targetBrand, targetLocId, null);
            if (typeof persistLocationProfile === 'function') persistLocationProfile(targetBrand, targetLocId, locObj);
          } else {
            // save_draft: Lưu bền vững theo workspace/brand/location
            var currentDraft = locObj.profileDraft || (typeof loadPersistedDraft === 'function' ? loadPersistedDraft(targetBrand, targetLocId) : null) || { updates: {}, explicitDeletes: [] };
            var curDeletes = (currentDraft.explicitDeletes || []).slice();

            explicitDeletes.forEach(function (k) {
              if (!curDeletes.includes(k)) curDeletes.push(k);
            });

            // Giá trị cập nhật mới nhất loại bỏ yêu cầu xóa cũ
            var newUpdates = updates || {};
            Object.keys(newUpdates).forEach(function (k) {
              if (newUpdates[k] !== undefined && newUpdates[k] !== null && String(newUpdates[k]).trim() !== '') {
                curDeletes = curDeletes.filter(function (delKey) { return delKey !== k; });
              }
            });

            var mergedUpdates = Object.assign({}, currentDraft.updates || {}, newUpdates);
            curDeletes.forEach(function (delKey) {
              delete mergedUpdates[delKey];
            });

            locObj.profileDraft = {
              updatedAt: new Date().toISOString(),
              updates: mergedUpdates,
              explicitDeletes: curDeletes
            };
            locObj.googleSyncStatus = 'draft_pending';
            if (typeof persistDraft === 'function') persistDraft(targetBrand, targetLocId, locObj.profileDraft);
          }

          return J({
            ok: true,
            action: action,
            syncStatus: locObj.googleSyncStatus,
            auditStatus: action === 'submit_google' ? 'Đã mô phỏng đồng bộ Google Business Profile (GBP API) thành công' : 'Đã lưu bản nháp nội bộ an toàn',
            diffs: diffs,
            location: locObj,
            draft: locObj.profileDraft,
            completeness: calcProfileCompleteness(locObj)
          });
        }

        // 3. Multi-location Post Dispatcher (Kiểm soát biến & Cô lập thương hiệu)
        if (p.includes('/posts/dispatch')) {
          var brandId = brandFromPath || body.brandId || S.brand || 'seoul-center';
          var bConfig = getBrandConfig(brandId);
          var brandLocs = getBrandLocations(brandId);
          var rawContent = body.masterContent || (body.masterPost && body.masterPost.content) || '';
          var targetLocIds = body.targetLocationIds || [];

          // KIỂM TRA CÔ LẬP THƯƠNG HIỆU (BRAND ISOLATION):
          // Nếu người dùng truyền targetLocationIds, tất cả phải thuộc thương hiệu này
          if (targetLocIds && targetLocIds.length > 0) {
            var foreignLocs = targetLocIds.filter(function (id) {
              return !brandLocs.some(function (bl) { return bl.locationId === id; });
            });
            if (foreignLocs.length > 0) {
              return J({
                error: 'Truy cập bị từ chối: Địa điểm không thuộc thương hiệu ' + bConfig.name + ' (Brand Isolation Violation)',
                code: 'FORBIDDEN_LOCATION_OWNERSHIP',
                foreignLocationIds: foreignLocs
              }, 403);
            }
          }

          // Nếu không truyền ID cụ thể hoặc scope = 'all', mặc định gửi toàn bộ chi nhánh của thương hiệu
          if (!targetLocIds || targetLocIds.length === 0 || body.scope === 'all') {
            targetLocIds = brandLocs.map(function (l) { return l.locationId; });
          }

          // Chống trùng địa điểm thuộc nhiều nhóm (Deduplication)
          targetLocIds = Array.from(new Set(targetLocIds));

          var targetLocations = brandLocs.filter(function (l) {
            return targetLocIds.includes(l.locationId);
          });

          var jobId = 'job_' + Date.now();
          var results = [];
          var missingVarWarnings = [];

          targetLocations.forEach(function (loc, idx) {
            var locationName = loc.displayName || loc.fullName;
            var address = loc.address || '';
            var hotline = loc.phone || '';
            var website = loc.website || '';
            var bookingLink = loc.bookingUrl || loc.website || '';

            if (rawContent.includes('{{booking_link}}') && !loc.bookingUrl && !loc.website) {
              missingVarWarnings.push({ locationId: loc.locationId, locationName: locationName, missingVar: 'booking_link' });
            }
            if (rawContent.includes('{{hotline}}') && !loc.phone) {
              missingVarWarnings.push({ locationId: loc.locationId, locationName: locationName, missingVar: 'hotline' });
            }

            var resolvedContent = rawContent
              .replace(/{{brand_name}}/g, bConfig.name)
              .replace(/{{location_name}}/g, locationName)
              .replace(/{{address}}/g, address)
              .replace(/{{hotline}}/g, hotline)
              .replace(/{{website}}/g, website)
              .replace(/{{booking_link}}/g, bookingLink);

            // Mô phỏng thất bại có chủ đích trên chi nhánh thứ 3 để test quy trình retry
            var isSimulatedFailure = (idx === 2 && targetLocations.length >= 3 && !body.isRetry);

            if (isSimulatedFailure) {
              results.push({
                locationId: loc.locationId,
                locationName: locationName,
                branchCode: loc.branchCode,
                contentSent: resolvedContent,
                dispatchedAt: new Date().toISOString(),
                status: 'failed',
                errorCode: 'ERR_IMAGE_DIMENSIONS',
                errorMessage: 'Ảnh sai tỷ lệ 4:3 chuẩn mực của Google. Hệ thống tự động đề xuất crop chuẩn.',
                suggestedAction: 'Bấm Thử lại địa điểm thất bại để tự động gửi lại qua API.'
              });
            } else {
              results.push({
                locationId: loc.locationId,
                locationName: locationName,
                branchCode: loc.branchCode,
                contentSent: resolvedContent,
                dispatchedAt: new Date().toISOString(),
                status: 'success',
                googlePostId: 'locations/' + (loc.placeId || loc.locationId) + '/localPosts/lp_' + (Date.now() + idx),
                publicUrl: 'https://maps.google.com/?cid=' + (loc.cid || '12345'),
                views: 0,
                clicks: 0
              });
            }
          });

          var failedCount = results.filter(function (r) { return r.status === 'failed'; }).length;
          var successCount = results.filter(function (r) { return r.status === 'success'; }).length;
          var overallStatus = failedCount === 0 ? 'success_all' : (successCount === 0 ? 'failed_all' : 'partial_success');

          var jobRecord = {
            jobId: jobId,
            brandId: brandId,
            title: body.title || 'Bài đăng đa chi nhánh ' + bConfig.name,
            type: body.type || 'STANDARD',
            masterContent: rawContent,
            targetLocationsCount: targetLocations.length,
            successCount: successCount,
            failedCount: failedCount,
            overallStatus: overallStatus,
            aggregateStatus: overallStatus,
            results: results,
            missingVarWarnings: missingVarWarnings,
            createdAt: new Date().toISOString()
          };

          window.SHARED_POST_JOBS = window.SHARED_POST_JOBS || {};
          window.SHARED_POST_JOBS[jobId] = jobRecord;
          window.__LAST_POST_JOB = jobRecord;
          return J({
            ok: true,
            job: jobRecord,
            targetLocationsCount: targetLocations.length,
            successCount: successCount,
            failedCount: failedCount,
            overallStatus: overallStatus,
            aggregateStatus: overallStatus,
            results: results
          });
        }

        // 4. Targeted Retry for Failed Posts (Xác thực Job ID, không tạo kết quả thay thế)
        if (p.includes('/posts/retry_failed') || p.includes('/posts/retry')) {
          var brandId = brandFromPath || body.brandId || S.brand || 'seoul-center';
          var brandLocs = getBrandLocations(brandId);
          var failedLocIds = body.failedLocationIds || body.failedLocIds || [];
          var reqJobId = body.jobId;
          var job = null;

          window.SHARED_POST_JOBS = window.SHARED_POST_JOBS || {};

          if (reqJobId) {
            job = window.SHARED_POST_JOBS[reqJobId];
            if (!job) {
              return J({
                error: 'Không tìm thấy tác vụ đăng bài với mã job: ' + reqJobId,
                code: 'JOB_NOT_FOUND',
                jobId: reqJobId
              }, 404);
            }
            if (job.brandId !== brandId) {
              return J({
                error: 'Tác vụ ' + reqJobId + ' không thuộc thương hiệu ' + brandId,
                code: 'FORBIDDEN_JOB_OWNERSHIP'
              }, 403);
            }
          } else {
            job = window.__LAST_POST_JOB;
            if (!job || job.brandId !== brandId) {
              return J({
                error: 'Không có tác vụ đăng bài nào trước đó để thử lại',
                code: 'JOB_NOT_FOUND'
              }, 404);
            }
          }

          // Nếu không truyền ID cụ thể, lấy toàn bộ chi nhánh đang lỗi trong job
          if (!failedLocIds.length) {
            failedLocIds = job.results.filter(function (r) { return r.status === 'failed'; }).map(function (r) { return r.locationId; });
          }

          var retriedCount = 0;
          job.results.forEach(function (r) {
            if (failedLocIds.includes(r.locationId) && r.status === 'failed') {
              r.status = 'success';
              r.retriedAt = new Date().toISOString();
              r.retrySuccess = true;
              r.errorCode = null;
              r.errorMessage = null;
              r.googlePostId = 'locations/' + r.locationId + '/localPosts/lp_retried_' + Date.now();
              r.publicUrl = 'https://maps.google.com/?cid=12345';
              retriedCount++;
            }
          });

          job.successCount = job.results.filter(function (r) { return r.status === 'success'; }).length;
          job.failedCount = job.results.filter(function (r) { return r.status === 'failed'; }).length;
          job.overallStatus = job.failedCount === 0 ? 'success_all' : 'partial_success';
          job.aggregateStatus = job.overallStatus;

          return J({
            ok: true,
            message: 'Đã thử lại thành công cho ' + retriedCount + ' địa điểm lỗi!',
            status: job.overallStatus,
            overallStatus: job.overallStatus,
            aggregateStatus: job.overallStatus,
            retriedCount: retriedCount,
            successCount: job.successCount,
            failedCount: job.failedCount,
            results: job.results
          });
        }

        // 5. Smart Group Live Preview & Save Rule
        if (p.includes('/location_groups/smart_preview')) {
          var brandId = brandFromPath || body.brandId || S.brand || 'seoul-center';
          var brandLocs = getBrandLocations(brandId);
          var conditions = body.conditions || [];
          var logic = body.logic || 'AND';

          var matchingLocs = brandLocs.filter(function (l) {
            return evalSmartGroupConditions(l, conditions, logic);
          });

          return J({
            total: brandLocs.length,
            totalCount: brandLocs.length,
            matchingCount: matchingLocs.length,
            matchedCount: matchingLocs.length,
            matchingLocations: matchingLocs.map(function (l) {
              return { locationId: l.locationId, displayName: l.displayName, branchCode: l.branchCode, googleRating: l.googleRating, businessStatus: l.businessStatus };
            }),
            evaluatedAt: new Date().toISOString()
          });
        }

        if (p.includes('/location_groups/save_smart')) {
          var brandId = brandFromPath || body.brandId || S.brand || 'seoul-center';
          var requestedId = body.groupId;
          var isReservedStaticId = !requestedId || requestedId === 'grp_all' || requestedId === 'all' || requestedId === 'new' || String(requestedId).indexOf('grp_reg_') === 0;
          var groupId = isReservedStaticId ? ('grp_smart_' + Date.now()) : requestedId;
          var existingSg = (window.SHARED_SMART_GROUPS && window.SHARED_SMART_GROUPS[brandId] && window.SHARED_SMART_GROUPS[brandId][groupId]) || null;
          var groupName = body.groupName || body.name || (existingSg && existingSg.name) || ('Nhóm Smart ' + Date.now().toString().slice(-4));
          var conditions = body.conditions || (existingSg && existingSg.conditions) || [];
          var logic = body.logic || (existingSg && existingSg.logic) || 'AND';
          var brandLocs = getBrandLocations(brandId);
          var matchingLocs = brandLocs.filter(function (l) {
            return evalSmartGroupConditions(l, conditions, logic);
          });
          var matchingIds = matchingLocs.map(function (l) { return l.locationId; });

          // Cập nhật mảng groups của các cơ sở trong thương hiệu
          brandLocs.forEach(function (loc) {
            loc.groups = loc.groups || [];
            var isMatch = matchingIds.includes(loc.locationId);
            if (isMatch) {
              if (!loc.groups.includes(groupId)) loc.groups.push(groupId);
              if (groupName && !loc.groups.includes(groupName)) loc.groups.push(groupName);
            } else {
              loc.groups = loc.groups.filter(function (g) { return g !== groupId && g !== groupName; });
            }
          });

          // Lưu nhóm động bền vững
          window.SHARED_SMART_GROUPS = window.SHARED_SMART_GROUPS || {};
          window.SHARED_SMART_GROUPS[brandId] = window.SHARED_SMART_GROUPS[brandId] || {};
          window.SHARED_SMART_GROUPS[brandId][groupId] = {
            id: groupId,
            name: groupName,
            conditions: conditions,
            logic: logic,
            matchingLocations: matchingIds,
            matchedCount: matchingIds.length,
            locationCount: matchingIds.length,
            lastEvaluatedAt: new Date().toISOString()
          };
          if (typeof persistSmartGroupsForBrand === 'function') {
            persistSmartGroupsForBrand(brandId);
          }

          return J({
            ok: true,
            groupId: groupId,
            groupName: groupName,
            group: window.SHARED_SMART_GROUPS[brandId][groupId],
            conditions: conditions,
            logic: logic,
            locationCount: matchingLocs.length,
            matchedCount: matchingLocs.length,
            matchingLocations: matchingIds,
            lastEvaluatedAt: new Date().toISOString()
          });
        }

        // 6. AI Suggest 3 Diverse Replies (Ngữ cảnh chuẩn hóa mọi ngành, xử lý riêng review chỉ chấm sao, không phát ngôn vượt thẩm quyền)
        if (p.includes('/ai/suggest_replies')) {
          var reviewId = body.reviewId;
          var targetBrand = brandFromPath || body.brandId || S.brand || 'seoul-center';
          var bConfig = getBrandConfig(targetBrand);
          var indPack = getIndustryPack(bConfig.industry);
          var pool = (D.rev[targetBrand] && D.rev[targetBrand].pool) || [];
          var rev = pool.find(function (r) { return r.id === reviewId; });

          if (!rev) {
            rev = {
              author: body.author || 'Khách hàng',
              rating: body.rating != null ? body.rating : 5,
              text: body.text || ''
            };
          }

          var author = rev.author || 'Quý khách';
          var rating = rev.rating != null ? rev.rating : 5;
          var text = (rev.text || '').trim();
          var sentiment = rev.analysis && rev.analysis.sentiment;
          var isNeg = rating <= 2 || sentiment === 'negative';
          var isNeutral = rating === 3 || sentiment === 'neutral';
          var isStarOnly = !text;
          var suggestions = [];

          if (isStarOnly) {
            // XỬ LÝ RIÊNG REVIEW CHỈ CHẤM SAO (KHÔNG CÓ CHỮ) - KHÔNG SUY DIỄN MÓN ĂN / Y TẾ / KỸ THUẬT
            if (isNeg) {
              suggestions = [
                {
                  id: 'sug_empathetic',
                  label: 'Đồng cảm & Lắng nghe',
                  tone: 'Đồng cảm & Lắng nghe',
                  text: 'Kính chào Quý khách ' + author + ', ' + bConfig.name + ' rất tiếc khi chưa mang lại trải nghiệm trọn vẹn khiến Quý khách hài lòng (đánh giá ' + rating + '★). Chúng tôi luôn mong muốn được lắng nghe cụ thể ý kiến đóng góp của Quý khách qua hotline ' + (bConfig.hotline || 'liên hệ chính thức') + ' để kịp thời ghi nhận và hoàn thiện dịch vụ chu đáo hơn.'
                },
                {
                  id: 'sug_professional',
                  label: 'Chuyên nghiệp & Chu đáo',
                  tone: 'Chuyên nghiệp & Chu đáo',
                  text: 'Kính chào Quý khách ' + author + '. Ban Quản lý ' + bConfig.name + ' xin ghi nhận đánh giá ' + rating + ' sao của Quý khách. Để chúng tôi có thể hiểu rõ hơn về trải nghiệm chưa như ý và hỗ trợ chu đáo nhất, rất mong Quý khách có thể gửi thêm thông tin phản hồi qua kênh liên hệ chính thức.'
                },
                {
                  id: 'sug_concise',
                  label: 'Ngắn gọn & Lịch thiệp',
                  tone: 'Ngắn gọn & Lịch thiệp',
                  text: 'Cảm ơn Quý khách ' + author + ' đã gửi đánh giá. ' + bConfig.name + ' xin chân thành tiếp thu và luôn nỗ lực nâng cao trải nghiệm khách hàng tốt hơn mỗi ngày.'
                }
              ];
            } else if (isNeutral) {
              // Review 3 sao chỉ chấm sao: phản hồi trung tính, không cảm ơn "tuyệt vời" hay "hài lòng"
              suggestions = [
                {
                  id: 'sug_empathetic',
                  label: 'Lắng nghe & Cải thiện',
                  tone: 'Lắng nghe & Cải thiện',
                  text: 'Kính chào Quý khách ' + author + ', ' + bConfig.name + ' chân thành cảm ơn Quý khách đã dành thời gian đánh giá 3★. Chúng tôi luôn mong muốn mang lại sự hài lòng cao hơn và rất mong nhận được thêm góp ý chi tiết qua hotline ' + (bConfig.hotline || 'liên hệ chính thức') + ' để ngày một hoàn thiện.'
                },
                {
                  id: 'sug_professional',
                  label: 'Chuyên nghiệp & Chu đáo',
                  tone: 'Chuyên nghiệp & Chu đáo',
                  text: 'Kính chào Quý khách ' + author + '. Ban Quản lý ' + bConfig.name + ' xin ghi nhận đánh giá của Quý khách. Chúng tôi luôn nỗ lực nâng cao tiêu chuẩn dịch vụ và hy vọng sẽ có cơ hội phục vụ Quý khách tốt hơn nữa ở những lần ghé thăm tiếp theo.'
                },
                {
                  id: 'sug_concise',
                  label: 'Ngắn gọn & Lịch thiệp',
                  tone: 'Ngắn gọn & Lịch thiệp',
                  text: 'Cảm ơn Quý khách ' + author + ' đã gửi đánh giá 3 sao. ' + bConfig.name + ' xin trân trọng tiếp thu để tiếp tục hoàn thiện chất lượng dịch vụ mỗi ngày.'
                }
              ];
            } else {
              suggestions = [
                {
                  id: 'sug_empathetic',
                  label: 'Ấm áp & Thân thiện',
                  tone: 'Ấm áp & Thân thiện',
                  text: 'Dạ cảm ơn ' + author + ' rất nhiều vì đã dành thời gian đánh giá ' + rating + ' sao cho ' + bConfig.name + ' ạ! Chúc ' + author + ' luôn có những trải nghiệm thật vui vẻ và mong sớm được tiếp tục đón tiếp Quý khách lần tới!'
                },
                {
                  id: 'sug_professional',
                  label: 'Chuyên nghiệp & Chu đáo',
                  tone: 'Chuyên nghiệp & Chu đáo',
                  text: 'Kính chào Quý khách ' + author + '. ' + bConfig.name + ' chân thành cảm ơn đánh giá ' + rating + ' sao của Quý khách. Sự ủng hộ của Quý khách là niềm khích lệ lớn cho toàn thể đội ngũ chúng tôi.'
                },
                {
                  id: 'sug_concise',
                  label: 'Ngắn gọn & Tươi vui',
                  tone: 'Ngắn gọn & Tươi vui',
                  text: 'Cảm ơn bạn ' + author + ' đã để lại đánh giá tích cực! ' + bConfig.name + ' rất hân hạnh được phục vụ bạn!'
                }
              ];
            }
          } else if (isNeutral) {
            // REVIEW CÓ CHỮ 3 SAO / TRUNG TÍNH (MỌI NGÀNH): PHẢN HỒI TRUNG TÍNH, KHÔNG CẢM ƠN TUYỆT VỜI / HÀI LÒNG
            suggestions = [
              {
                id: 'sug_empathetic',
                label: 'Đồng cảm & Lắng nghe',
                tone: 'Đồng cảm & Lắng nghe',
                text: 'Kính chào Quý khách ' + author + ', ' + bConfig.name + ' chân thành cảm ơn Quý khách đã chia sẻ nhận xét. Chúng tôi luôn mong muốn mang lại trải nghiệm trọn vẹn hơn nữa và xin ghi nhận ý kiến đóng góp của Quý khách để tiếp tục cải tiến chất lượng dịch vụ.'
              },
              {
                id: 'sug_professional',
                label: 'Chuyên nghiệp & Chu đáo',
                tone: 'Chuyên nghiệp & Chu đáo',
                text: 'Kính chào Quý khách ' + author + '. Ban Quản lý ' + bConfig.name + ' xin tiếp thu phản hồi của Quý khách. Chúng tôi luôn nỗ lực nâng cao từng chi tiết trong phục vụ và hy vọng sẽ có cơ hội đem lại trải nghiệm tốt hơn cho Quý khách trong những dịp tới.'
              },
              {
                id: 'sug_concise',
                label: 'Ngắn gọn & Lịch thiệp',
                tone: 'Ngắn gọn & Lịch thiệp',
                text: 'Cảm ơn Quý khách ' + author + ' đã đóng góp ý kiến. ' + bConfig.name + ' xin chân thành tiếp thu để hoàn thiện dịch vụ chu đáo hơn.'
              }
            ];
          } else if (bConfig.industry === 'f_and_b') {
            if (isNeg) {
              suggestions = [
                {
                  id: 'sug_empathetic',
                  label: 'Đồng cảm & Chân thành',
                  tone: 'Đồng cảm & Chân thành',
                  text: 'Dạ em chào ' + author + ', Nhà hàng ' + bConfig.name + ' thành thật xin lỗi vì trải nghiệm ẩm thực và phục vụ tại chi nhánh chưa làm ' + author + ' hài lòng. Chúng tôi luôn coi trọng từng đóng góp để hoàn thiện chất lượng món ăn và phong cách phục vụ. Rất mong được lắng nghe thêm chia sẻ qua hotline ' + (bConfig.hotline || '1900 6868') + ' để chăm sóc chu đáo hơn lần tới ạ.'
                },
                {
                  id: 'sug_professional',
                  label: 'Chuyên nghiệp & Chu đáo',
                  tone: 'Chuyên nghiệp & Chu đáo',
                  text: 'Kính chào Quý khách ' + author + '. Ban Quản lý ' + bConfig.name + ' xin ghi nhận ý kiến phản hồi của Quý khách. Chúng tôi cam kết tiêu chuẩn ẩm thực và vệ sinh cao nhất, luôn nỗ lực đem lại sự an tâm cho khách hàng và mong nhận được thêm chia sẻ qua hotline ' + (bConfig.hotline || '1900 6868') + ' ạ.'
                },
                {
                  id: 'sug_concise',
                  label: 'Ngắn gọn & Lịch thiệp',
                  tone: 'Ngắn gọn & Lịch thiệp',
                  text: 'Cảm ơn Quý khách ' + author + ' đã đóng góp ý kiến thẳng thắn. ' + bConfig.name + ' xin chân thành tiếp thu để nâng cao chất lượng món ăn và dịch vụ tốt hơn mỗi ngày.'
                }
              ];
            } else {
              suggestions = [
                {
                  id: 'sug_empathetic',
                  label: 'Ấm áp & Thân thiện',
                  tone: 'Ấm áp & Thân thiện',
                  text: 'Dạ cảm ơn ' + author + ' rất nhiều vì đã ghé dùng bữa tại ' + bConfig.name + ' ạ! Toàn thể đội ngũ bếp và nhân viên rất vui khi nhận được đánh giá ' + rating + ' sao này. Chúc ' + author + ' luôn ngon miệng và hẹn gặp lại lần tới nhé!'
                },
                {
                  id: 'sug_professional',
                  label: 'Chuyên nghiệp & Chu đáo',
                  tone: 'Chuyên nghiệp & Chu đáo',
                  text: 'Kính chào Quý khách ' + author + '. ' + bConfig.name + ' vô cùng trân trọng sự hài lòng và đánh giá tích cực của Quý khách. Đây là động lực lớn để toàn thể đội ngũ tiếp tục phát huy hương vị ẩm thực đặc sắc và tiêu chuẩn phục vụ tận tâm nhất.'
                },
                {
                  id: 'sug_concise',
                  label: 'Ngắn gọn & Tươi vui',
                  tone: 'Ngắn gọn & Tươi vui',
                  text: 'Cảm ơn bạn ' + author + ' đã để lại đánh giá tuyệt vời! ' + bConfig.name + ' rất hân hạnh được đồng hành cùng những bữa ăn ấm cúng của bạn!'
                }
              ];
            }
          } else if (bConfig.industry === 'retail_ecommerce') {
            if (isNeg) {
              suggestions = [
                {
                  id: 'sug_empathetic',
                  label: 'Đồng cảm & Chân thành',
                  tone: 'Đồng cảm & Chân thành',
                  text: 'Kính chào Quý khách ' + author + ', ' + bConfig.name + ' rất tiếc khi trải nghiệm mua sắm/đơn hàng vừa qua chưa đạt kỳ vọng của Quý khách. Chúng tôi luôn cam kết quyền lợi chính hãng và chính sách bảo hành minh bạch. Kính mời Quý khách liên hệ hotline ' + (bConfig.hotline || '1800 8899') + ' để được hỗ trợ kiểm tra chu đáo nhất.'
                },
                {
                  id: 'sug_professional',
                  label: 'Chuyên nghiệp & Chu đáo',
                  tone: 'Chuyên nghiệp & Chu đáo',
                  text: 'Kính chào Quý khách ' + author + '. Ban Quản trị ' + bConfig.name + ' xin chân thành cáo lỗi về sự cố đối với sản phẩm/đơn hàng của Quý khách. Chúng tôi cam kết nguồn hàng chính hãng và quyền lợi đổi trả minh bạch. Kính mời Quý khách liên hệ hotline ' + (bConfig.hotline || '1800 8899') + ' để được hỗ trợ kỹ thuật ngay.'
                },
                {
                  id: 'sug_concise',
                  label: 'Ngắn gọn & Lịch thiệp',
                  tone: 'Ngắn gọn & Lịch thiệp',
                  text: 'Cảm ơn Quý khách ' + author + ' đã phản ánh. ' + bConfig.name + ' xin ghi nhận và nỗ lực nâng cao trải nghiệm mua sắm cũng như dịch vụ hậu mãi tốt hơn.'
                }
              ];
            } else {
              suggestions = [
                {
                  id: 'sug_empathetic',
                  label: 'Ấm áp & Thân thiện',
                  tone: 'Ấm áp & Thân thiện',
                  text: 'Cảm ơn ' + author + ' đã tin chọn sản phẩm công nghệ tại ' + bConfig.name + '! Chúc ' + author + ' có những trải nghiệm thật mượt mà cùng thiết bị mới ạ!'
                },
                {
                  id: 'sug_professional',
                  label: 'Chuyên nghiệp & Chu đáo',
                  tone: 'Chuyên nghiệp & Chu đáo',
                  text: 'Kính chào Quý khách ' + author + '. ' + bConfig.name + ' chân thành cảm ơn đánh giá ' + rating + ' sao của Quý khách. Chúng tôi cam kết luôn cung cấp sản phẩm chính hãng và dịch vụ bảo hành chu đáo nhất.'
                },
                {
                  id: 'sug_concise',
                  label: 'Ngắn gọn & Tươi vui',
                  tone: 'Ngắn gọn & Tươi vui',
                  text: 'Cảm ơn Quý khách ' + author + ' đã tin tưởng ' + bConfig.name + '! Rất vui được tiếp tục phục vụ Quý khách trong những đơn hàng tiếp theo!'
                }
              ];
            }
          } else if (bConfig.industry === 'aesthetic_clinic' || bConfig.industry === 'medical' || bConfig.industry === 'beauty') {
            if (isNeg) {
              suggestions = [
                {
                  id: 'sug_empathetic',
                  label: 'Đồng cảm & Chân thành',
                  tone: 'Đồng cảm & Chân thành',
                  text: 'Dạ em chào ' + author + ', Viện thẩm mỹ ' + bConfig.name + ' rất tiếc khi trải nghiệm dịch vụ tại cơ sở chưa làm ' + author + ' hài lòng. Chúng tôi luôn trân trọng lắng nghe mọi ý kiến đóng góp của Quý khách. Rất mong được lắng nghe thêm chia sẻ qua hotline ' + (bConfig.hotline || '0941 623 322') + ' để kịp thời chăm sóc chu đáo hơn.'
                },
                {
                  id: 'sug_professional',
                  label: 'Chuyên nghiệp & Chu đáo',
                  tone: 'Chuyên nghiệp & Chu đáo',
                  text: 'Kính chào Quý khách ' + author + '. Ban Quản lý ' + bConfig.name + ' xin ghi nhận phản hồi của Quý khách. Chúng tôi luôn cam kết an toàn quy chuẩn, và rất mong được lắng nghe thêm chia sẻ qua hotline ' + (bConfig.hotline || '0941 623 322') + ' để có cơ hội phục vụ Quý khách chu đáo nhất.'
                },
                {
                  id: 'sug_concise',
                  label: 'Ngắn gọn & Lịch thiệp',
                  tone: 'Ngắn gọn & Lịch thiệp',
                  text: 'Cảm ơn Quý khách ' + author + ' đã phản hồi thẳng thắn. ' + bConfig.name + ' xin chân thành tiếp thu ý kiến này để nâng cao chất lượng dịch vụ của cơ sở trong thời gian tới.'
                }
              ];
            } else {
              suggestions = [
                {
                  id: 'sug_empathetic',
                  label: 'Ấm áp & Thân thiện',
                  tone: 'Ấm áp & Thân thiện',
                  text: 'Dạ em cảm ơn ' + author + ' rất nhiều vì đã tin tưởng lựa chọn cơ sở ạ! Đội ngũ bác sĩ và chuyên viên rất vui khi nhận được đánh giá ' + rating + ' sao này. Chúc ' + author + ' luôn rạng rỡ và hẹn gặp lại lần tới ạ!'
                },
                {
                  id: 'sug_professional',
                  label: 'Chuyên nghiệp & Chu đáo',
                  tone: 'Chuyên nghiệp & Chu đáo',
                  text: 'Kính chào Quý khách ' + author + '. Chúng tôi vô cùng trân trọng sự hài lòng và đánh giá tích cực của Quý khách. Đây là động lực lớn để toàn thể đội ngũ y bác sĩ tiếp tục phát huy tiêu chuẩn phục vụ chuyên môn cao nhất.'
                },
                {
                  id: 'sug_concise',
                  label: 'Ngắn gọn & Tươi vui',
                  tone: 'Ngắn gọn & Tươi vui',
                  text: 'Cảm ơn bạn ' + author + ' đã để lại đánh giá tuyệt vời! ' + bConfig.name + ' rất hân hạnh được đồng hành cùng bạn!'
                }
              ];
            }
          } else {
            // NHÁNH GENERIC TRUNG TÍNH (CHO MỌI NGÀNH KHÁC - KHÔNG BÁC SĨ, KHÔNG BẾP TRƯỞNG)
            if (isNeg) {
              suggestions = [
                {
                  id: 'sug_empathetic',
                  label: 'Đồng cảm & Chân thành',
                  tone: 'Đồng cảm & Chân thành',
                  text: 'Kính chào Quý khách ' + author + ', ' + bConfig.name + ' rất tiếc khi trải nghiệm vừa qua chưa đáp ứng kỳ vọng của Quý khách. Chúng tôi luôn trân trọng mọi phản ánh đóng góp để hoàn thiện chất lượng dịch vụ. Kính mời Quý khách liên hệ hotline ' + (bConfig.hotline || 'chăm sóc khách hàng') + ' để được hỗ trợ chu đáo nhất.'
                },
                {
                  id: 'sug_professional',
                  label: 'Chuyên nghiệp & Chu đáo',
                  tone: 'Chuyên nghiệp & Chu đáo',
                  text: 'Kính chào Quý khách ' + author + '. Ban Quản lý ' + bConfig.name + ' xin ghi nhận ý kiến phản ánh của Quý khách. Chúng tôi cam kết duy trì chuẩn mực dịch vụ cao nhất và luôn sẵn sàng lắng nghe mọi góp ý qua hotline ' + (bConfig.hotline || 'chăm sóc khách hàng') + ' để hoàn thiện hơn.'
                },
                {
                  id: 'sug_concise',
                  label: 'Ngắn gọn & Lịch thiệp',
                  tone: 'Ngắn gọn & Lịch thiệp',
                  text: 'Cảm ơn Quý khách ' + author + ' đã đóng góp ý kiến. ' + bConfig.name + ' xin chân thành tiếp thu để hoàn thiện dịch vụ ngày một tốt hơn.'
                }
              ];
            } else {
              suggestions = [
                {
                  id: 'sug_empathetic',
                  label: 'Ấm áp & Thân thiện',
                  tone: 'Ấm áp & Thân thiện',
                  text: 'Dạ cảm ơn ' + author + ' rất nhiều vì đã tin tưởng lựa chọn ' + bConfig.name + '! Toàn thể đội ngũ rất vui khi nhận được đánh giá ' + rating + ' sao này. Chúc ' + author + ' nhiều sức khỏe và niềm vui ạ!'
                },
                {
                  id: 'sug_professional',
                  label: 'Chuyên nghiệp & Chu đáo',
                  tone: 'Chuyên nghiệp & Chu đáo',
                  text: 'Kính chào Quý khách ' + author + '. ' + bConfig.name + ' vô cùng trân trọng sự hài lòng và đánh giá tích cực của Quý khách. Đây là động lực lớn để chúng tôi không ngừng hoàn thiện chất lượng phục vụ.'
                },
                {
                  id: 'sug_concise',
                  label: 'Ngắn gọn & Tươi vui',
                  tone: 'Ngắn gọn & Tươi vui',
                  text: 'Cảm ơn bạn ' + author + ' đã để lại đánh giá tuyệt vời! ' + bConfig.name + ' rất hân hạnh được tiếp tục đồng hành cùng bạn!'
                }
              ];
            }
          }

          return J({
            ok: true,
            reviewId: reviewId,
            brandId: targetBrand,
            industry: bConfig.industry,
            suggestions: suggestions,
            guardrailNotice: 'Nội dung tuân thủ quy tắc an toàn: Không tự ý hứa hẹn bồi thường tài chính trái thẩm quyền, không để lộ PII khách hàng, không suy diễn review chỉ chấm sao.'
          });
        }

        // 7. Cập nhật trạng thái Cảnh báo Watchlist (CÔ LẬP THƯƠNG HIỆU, VALIDATION CHẶT CHẼ & Lưu vết bền vững)
        if (p.includes('/alerts/') && p.includes('/status')) {
          var pathSegments = p.slice(5).split('/');
          var targetBrand = pathSegments[0] || brandFromPath || S.brand || 'seoul-center';
          var alertParts = p.split('/alerts/')[1].split('/');
          var alertId = alertParts[0];

          // CHỈ CHẤP NHẬN TRẠNG THÁI HỢP LỆ THEO VÒNG ĐỜI NGHIỆP VỤ
          var ALLOWED_ALERT_STATUSES = ['new', 'seen', 'in_progress', 'resolved', 'dismissed'];
          var newStatus = body && body.status;
          if (!newStatus || !ALLOWED_ALERT_STATUSES.includes(newStatus)) {
            return J({
              ok: false,
              error: 'Trạng thái cảnh báo không hợp lệ: ' + newStatus + '. Chỉ chấp nhận các trạng thái: ' + ALLOWED_ALERT_STATUSES.join(', '),
              code: 'INVALID_ALERT_STATUS',
              allowedStatuses: ALLOWED_ALERT_STATUSES,
              providedStatus: newStatus
            }, 400);
          }

          // Chỉ tìm trong phạm vi thương hiệu được chỉ định trên đường dẫn
          var brandAlertList = (SHARED_ALERTS && SHARED_ALERTS[targetBrand]) || [];
          var foundAlert = brandAlertList.find(function (al) { return al.id === alertId; });

          if (!foundAlert) {
            // Kiểm tra xem ID có thuộc thương hiệu khác để từ chối truy cập
            var foreignBrand = null;
            Object.keys(SHARED_ALERTS).forEach(function (bk) {
              if (bk !== targetBrand && (SHARED_ALERTS[bk] || []).some(function (al) { return al.id === alertId; })) {
                foreignBrand = bk;
              }
            });

            if (foreignBrand) {
              return J({
                error: 'Truy cập bị từ chối: Cảnh báo ' + alertId + ' không thuộc thương hiệu ' + targetBrand + ' (Brand Isolation Violation)',
                code: 'FORBIDDEN_ALERT_OWNERSHIP',
                targetBrand: targetBrand,
                alertId: alertId
              }, 403);
            }

            return J({
              error: 'Không tìm thấy cảnh báo ' + alertId + ' trong thương hiệu ' + targetBrand,
              code: 'ALERT_NOT_FOUND',
              alertId: alertId
            }, 404);
          }

          foundAlert.status = newStatus;
          foundAlert.updatedAt = new Date().toISOString();
          if (typeof persistAlertsForBrand === 'function') {
            persistAlertsForBrand(targetBrand);
          }
          return J({ ok: true, alertId: alertId, status: newStatus, alert: foundAlert, updatedAt: foundAlert.updatedAt });
        }

        // 8. Cập nhật cấu hình AI chuẩn hóa
        if (p === '/api/config/ai' || p.includes('/config/ai')) {
          D.config.ai = Object.assign({}, D.config.ai, body);
          return J({ ok: true, config: D.config.ai });
        }

        // Lưu bài đăng Google Business thông thường
        if (p.indexOf('/posts') !== -1) {
          var brandId = brandFromPath || S.brand || 'seoul-center';
          body.id = 'post_' + Date.now();
          body.createdAt = new Date().toISOString();
          body.status = body.status || 'draft';
          return J({ ok: true, post: body });
        }
      } catch (e) {
        return J({ error: e.message }, 400);
      }
    }

    var parts = p.slice(5).split('/');
    var b = parts[0];
    var ep = parts[1];

    if (b === 'config') {
      if (ep === 'ai') return J(D.config.ai || {
        provider: 'Google AI Studio / Gemini',
        model: 'gemini-2.5-flash',
        availableModels: [
          { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Khuyến nghị - Ổn định & Nhanh)', status: 'active' },
          { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Suy luận sâu & Phức tạp)', status: 'active' }
        ],
        autoPublishEnabled: false,
        mode: 'draft_and_queue',
        quietHours: { enabled: true, start: '22:00', end: '07:00' },
        cooldownMinutes: 15,
        escalateNegativeRating: true,
        escalateKeywords: ['khiếu nại', 'thái độ', 'bồi thường', 'dị ứng', 'hỏng', 'lừa đảo', 'kiện'],
        maxMonthlyTokens: 500000,
        usedTokens: 45200
      });
      return J(D.config);
    }

    // --- ENDPOINT: REVIEWS VỚI BỘ LỌC CHUẨN HÓA VÀ MEDIA ---
    if (ep === 'reviews') {
      var R = D.rev[b]; if (!R) return J({ total: 0, items: [] });
      var sp = url.searchParams;
      var days = sp.get('days') && sp.get('days') !== 'all' ? +sp.get('days') : null;
      var st = sp.get('stars') || sp.get('star') || '';
      var so = sp.get('sort') || 'newest';
      var br = sp.get('branch') || '';
      var tp = sp.get('topic') || '';
      var q = (sp.get('q') || '').toLowerCase().trim();
      var status = sp.get('status') || '';
      var assignee = sp.get('assignee') || '';
      var idsParam = sp.get('ids');
      var filterIds = idsParam ? idsParam.split(',').filter(Boolean) : null;
      var locId = sp.get('locationId') || '';
      var mediaFilter = sp.get('media') || sp.get('filter') || '';

      var pool = R.pool || [];
      var filtered = pool.filter(function (r) {
        if (filterIds && filterIds.indexOf(r.id) === -1) return false;
        if (days && days > 0) {
          var refTime = CB_CONFIG.SNAPSHOT_TIME;
          var cutoff = refTime - days * 864e5;
          if (new Date(r.date || '2026-10-01T00:00:00Z').getTime() < cutoff) return false;
        }
        if (st === '1' && r.rating !== 1) return false;
        if (st === '2' && r.rating !== 2) return false;
        if (st === '3' && r.rating !== 3) return false;
        if (st === '4' && r.rating !== 4) return false;
        if (st === '5' && r.rating !== 5) return false;
        if (st === 'neg') {
          var isNegative = (r.rating != null && r.rating <= 2) || (r.rating == null && r.analysis && r.analysis.sentiment === 'negative');
          if (!isNegative) return false;
        }
        if (st === 'pos') {
          var isPositive = (r.rating != null && r.rating >= 4) || (r.rating == null && r.analysis && r.analysis.sentiment === 'positive');
          if (!isPositive) return false;
        }
        if (locId && locId !== 'all' && r.locationId !== locId) return false;
        if (br && br !== 'all' && r.branch !== br) return false;
        if (tp && tp !== 'all') {
          var hasTopic = r.analysis && r.analysis.topics && r.analysis.topics.indexOf(tp) !== -1;
          if (!hasTopic) {
            var bConfig = getBrandConfig(b);
            var indPack = getIndustryPack(bConfig.industry);
            var topicKeywords = (indPack.keywords && indPack.keywords[tp]) || [];
            if (!matchWords(r.text, topicKeywords)) return false;
          }
        }
        if (q) {
          var qMatch = (r.author || '').toLowerCase().indexOf(q) !== -1 ||
            (r.text || '').toLowerCase().indexOf(q) !== -1 ||
            (r.branch || '').toLowerCase().indexOf(q) !== -1 ||
            (r.id || '').toLowerCase().indexOf(q) !== -1;
          if (!qMatch) return false;
        }
        if (mediaFilter === 'with_photo' && !r.hasPhoto) return false;
        if (mediaFilter === 'text_only' && (!r.hasText || r.hasPhoto)) return false;
        if (mediaFilter === 'rating_only' && (r.hasText || r.hasPhoto)) return false;
        if (mediaFilter === 'missing' && r.missingStatus !== 'suspected_missing') return false;

        if (status === 'unreplied') {
          if (!isUnrepliedGoogleReview(r)) return false;
        }
        if (status === 'need_action' && r.ticketStatus === 'resolved') return false;
        if (status === 'overdue' && !r.slaOverdue) return false;
        if (status === 'resolved' && r.ticketStatus !== 'resolved') return false;
        if (assignee && assignee !== 'all' && r.assignee !== assignee) return false;
        return true;
      });

      if (so === 'newest') {
        filtered.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
      } else if (so === 'lowest') {
        filtered.sort(function (a, b) { return (a.rating != null ? a.rating : 99) - (b.rating != null ? b.rating : 99) || (new Date(b.date) - new Date(a.date)); });
      } else if (so === 'highest') {
        filtered.sort(function (a, b) { return (b.rating != null ? b.rating : -1) - (a.rating != null ? a.rating : -1) || (new Date(b.date) - new Date(a.date)); });
      } else if (so === 'overdue') {
        filtered.sort(function (a, b) { return (b.slaOverdue ? 1 : 0) - (a.slaOverdue ? 1 : 0) || (new Date(b.date) - new Date(a.date)); });
      }

      var off = +sp.get('offset') || 0, lim = +sp.get('limit') || 20;
      return J({
        total: filtered.length,
        items: filtered.slice(off, off + lim),
        google: R.combos && R.combos['||'] ? R.combos['||'].google : null
      });
    }

    // Tự động sinh dữ liệu thống kê từ review pool cho thương hiệu
    var pool = (D.rev[b] && D.rev[b].pool) || [];
    var days = url.searchParams.get('days') ? +url.searchParams.get('days') : 30;
    var refTime = CB_CONFIG.SNAPSHOT_TIME;
    var cutoff = refTime - days * 864e5;
    var prevCutoff = cutoff - days * 864e5;
    var periodRevs = pool.filter(function (r) { return new Date(r.date || '2026-10-01').getTime() >= cutoff; });
    var total = periodRevs.length;
    var ratedRevs = periodRevs.filter(function (r) { return r.rating != null && r.rating >= 1 && r.rating <= 5; });
    var avg = ratedRevs.length ? (ratedRevs.reduce(function (s, r) { return s + r.rating; }, 0) / ratedRevs.length) : null;
    var negRevs = periodRevs.filter(function (r) { return (r.rating != null && r.rating <= 2) || (r.rating == null && r.analysis && r.analysis.sentiment === 'negative'); });
    var negCount = negRevs.length;

    // Tính toán kỳ trước thực tế
    var prevPeriodRevs = pool.filter(function (r) {
      var t = new Date(r.date || '2026-10-01').getTime();
      return t >= prevCutoff && t < cutoff;
    });
    var prevTotal = prevPeriodRevs.length;
    var prevRated = prevPeriodRevs.filter(function (r) { return r.rating != null && r.rating >= 1 && r.rating <= 5; });
    var prevAvg = prevRated.length ? (prevRated.reduce(function (s, r) { return s + r.rating; }, 0) / prevRated.length) : null;
    var prevNeg = prevPeriodRevs.filter(function (r) { return (r.rating != null && r.rating <= 2) || (r.rating == null && r.analysis && r.analysis.sentiment === 'negative'); }).length;

    function getWeekMon(dStr) {
      var d = new Date(dStr);
      var day = d.getUTCDay();
      var diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
      var mon = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
      return mon.toISOString().slice(0, 10);
    }

    var weekMap = {};
    periodRevs.forEach(function (r) {
      var w = getWeekMon(r.date || '2026-10-01');
      if (!weekMap[w]) weekMap[w] = [];
      weekMap[w].push(r);
    });

    var sortedWeeks = Object.keys(weekMap).sort();
    var weeklyList = sortedWeeks.map(function (w) {
      var wRevs = weekMap[w];
      var wRated = wRevs.filter(function (r) { return r.rating != null && r.rating >= 1 && r.rating <= 5; });
      var pos = wRevs.filter(function (r) { return (r.rating != null && r.rating >= 4) || (r.rating == null && r.analysis && r.analysis.sentiment === 'positive'); }).length;
      var neg = wRevs.filter(function (r) { return (r.rating != null && r.rating <= 2) || (r.rating == null && r.analysis && r.analysis.sentiment === 'negative'); }).length;
      var neu = wRevs.length - pos - neg;
      var wAvg = wRated.length ? Math.round((wRated.reduce(function (s, r) { return s + r.rating; }, 0) / wRated.length) * 10) / 10 : null;
      return { week: w, positive: pos, neutral: Math.max(0, neu), negative: neg, total: wRevs.length, avg: wAvg };
    });

    // --- ENDPOINT: LOCATIONS (DANH SÁCH ĐỊA ĐIỂM GBP SMART - PHẦN E) ---
    // --- ENDPOINT: LOCATION PROFILE DETAIL (YÊU CẦU 3 & CÔ LẬP THƯƠNG HIỆU & NẠP NHÁP BỀN VỮNG) ---
    if (p.includes('/profile') && p.includes('/locations/')) {
      var targetLocId = p.split('/locations/')[1].split('/')[0];
      var targetBrand = b || brandFromPath || S.brand || 'seoul-center';
      var locObj = SHARED_LOCATIONS.find(function (l) { return l.locationId === targetLocId; });
      if (!locObj) return J({ error: 'Không tìm thấy địa điểm', code: 'LOCATION_NOT_FOUND' }, 404);
      if (locObj.brandId !== targetBrand) {
        return J({
          error: 'Truy cập bị từ chối: Địa điểm không thuộc thương hiệu ' + targetBrand + ' (Brand Isolation Violation)',
          code: 'FORBIDDEN_LOCATION_OWNERSHIP'
        }, 403);
      }
      // Nạp nháp bền vững từ localStorage nếu phiên mới tải lại
      var savedDraft = typeof loadPersistedDraft === 'function' ? loadPersistedDraft(targetBrand, targetLocId) : null;
      if (savedDraft) {
        locObj.profileDraft = savedDraft;
        locObj.googleSyncStatus = 'draft_pending';
      }
      return J({
        location: locObj,
        completeness: calcProfileCompleteness(locObj),
        draft: locObj.profileDraft || null,
        syncStatus: locObj.googleSyncStatus || 'synced'
      });
    }

    // Endpoint đọc chi tiết 1 địa điểm cụ thể: /api/:brand/locations/:id
    if (ep === 'locations' && parts[2]) {
      var targetLocId = parts[2];
      var locObj = SHARED_LOCATIONS.find(function (l) { return l.locationId === targetLocId; });
      if (!locObj) return J({ error: 'Không tìm thấy địa điểm', code: 'LOCATION_NOT_FOUND' }, 404);
      if (locObj.brandId !== b) {
        return J({
          error: 'Truy cập bị từ chối: Địa điểm không thuộc thương hiệu ' + b + ' (Brand Isolation Violation)',
          code: 'FORBIDDEN_LOCATION_OWNERSHIP'
        }, 403);
      }
      return J({ location: locObj, completeness: calcProfileCompleteness(locObj) });
    }

    // --- ENDPOINT: LOCATION GROUP DASHBOARD (YÊU CẦU 4 - THỐNG NHẤT CẤU TRÚC VÀ STATS) ---
    if (p.includes('/location_groups/') && p.includes('/dashboard')) {
      if (typeof loadPersistedSmartGroups === 'function') loadPersistedSmartGroups();
      var rawGroupId = p.split('/location_groups/')[1].split('/')[0];
      var groupId = decodeURIComponent(rawGroupId);
      var brandLocs = getBrandLocations(b);
      var bSmart = (window.SHARED_SMART_GROUPS && window.SHARED_SMART_GROUPS[b] && (window.SHARED_SMART_GROUPS[b][groupId] || window.SHARED_SMART_GROUPS[b][rawGroupId])) || null;

      var groupLocs = [];
      if (groupId === 'grp_all' || groupId === 'all') {
        groupLocs = brandLocs.slice();
      } else if (groupId.indexOf('grp_reg_') === 0) {
        var regClean = groupId.replace('grp_reg_', '');
        groupLocs = brandLocs.filter(function (l) {
          var r = (l.region || l.province || 'khu_vuc_chinh').toLowerCase().replace(/[^a-z0-9]/g, '_');
          return r === regClean;
        });
      } else if (bSmart) {
        // Tái đánh giá điều kiện nhóm động tại thời điểm truy vấn
        groupLocs = brandLocs.filter(function (l) {
          return evalSmartGroupConditions(l, bSmart.conditions, bSmart.logic);
        });
      } else {
        groupLocs = brandLocs.filter(function (l) {
          return l.groups && (l.groups.includes(groupId) || l.groups.includes(rawGroupId));
        });
      }

      // TUYỆT ĐỐI KHÔNG TỰ Ý CHUYỂN THÀNH TOÀN BỘ THƯƠNG HIỆU KHI NHÓM RỖNG HOẶC KHÔNG TỒN TẠI
      if (!groupLocs.length) {
        return J({
          groupName: groupId,
          locationCount: 0,
          locations: [],
          health: null,
          profileCompleteness: {
            percentage: null,
            displayPercentage: 'Chưa đủ dữ liệu'
          },
          performance: {
            impressions: 0,
            calls: 0,
            directions: 0
          },
          triage: {
            unreplied: 0,
            overdue: 0
          },
          stats: {
            reputationHealth: null,
            avgRating: null,
            overdueCount: 0,
            profileCompleteness: null,
            impressions: 0,
            calls: 0,
            directions: 0
          }
        });
      }

      var groupRevs = pool.filter(function (r) {
        return groupLocs.some(function (l) { return r.locationId === l.locationId || (r.branch && r.branch === l.fullName); });
      });

      var gHealth = calcBrandHealth(groupRevs, getBrandConfig(b), days);
      var scoredCompleteness = groupLocs.map(function (l) { return calcProfileCompleteness(l).percentage; }).filter(function (v) { return v != null; });
      var gCompleteness = scoredCompleteness.length ? Math.round(scoredCompleteness.reduce(function (s, v) { return s + v; }, 0) / scoredCompleteness.length) : null;
      var gPerformance = {
        impressions: groupLocs.reduce(function (s, l) { return s + (l.performance ? l.performance.searchImpressions : 0); }, 0),
        calls: groupLocs.reduce(function (s, l) { return s + (l.performance ? l.performance.callClicks : 0); }, 0),
        directions: groupLocs.reduce(function (s, l) { return s + (l.performance ? l.performance.directionRequests : 0); }, 0)
      };

      return J({
        groupName: groupId,
        locationCount: groupLocs.length,
        locations: groupLocs,
        health: gHealth, // Nhóm A
        profileCompleteness: { // Nhóm B
          percentage: gCompleteness,
          displayPercentage: gCompleteness != null ? (gCompleteness + '%') : 'Chưa đủ dữ liệu'
        },
        performance: gPerformance, // Nhóm C
        triage: {
          unreplied: groupRevs.filter(isUnrepliedGoogleReview).length,
          overdue: groupRevs.filter(function (r) { return r.slaOverdue; }).length
        },
        stats: {
          reputationHealth: gHealth != null ? gHealth.score : null,
          avgRating: gHealth != null && gHealth.kpi ? gHealth.kpi.avgRating : null,
          overdueCount: groupRevs.filter(function (r) { return r.slaOverdue; }).length,
          profileCompleteness: gCompleteness,
          impressions: gPerformance.impressions,
          calls: gPerformance.calls,
          directions: gPerformance.directions
        }
      });
    }


    if (ep === 'locations') {
      var brandLocs = getBrandLocations(b);
      var sp = url.searchParams;
      var daysParam = sp.get('days');
      var targetCutoff = (daysParam && daysParam !== 'all' && +daysParam > 0) ? (refTime - (+daysParam) * 864e5) : 0;

      var locItems = brandLocs.map(function (loc) {
        var lRevs = pool.filter(function (r) {
          return r.locationId === loc.locationId || (r.branch && r.branch === loc.fullName);
        });
        var lPeriodRevs = lRevs.filter(function (r) {
          if (!targetCutoff) return true;
          return new Date(r.date || '2026-10-01').getTime() >= targetCutoff;
        });

        var photoCount = lPeriodRevs.filter(function (r) { return r.hasPhoto; }).length;
        var textOnlyCount = lPeriodRevs.filter(function (r) { return r.hasText && !r.hasPhoto; }).length;
        var ratingOnlyCount = lPeriodRevs.filter(function (r) { return !r.hasText && !r.hasPhoto; }).length;
        var missingCount = lRevs.filter(function (r) { return r.missingStatus === 'suspected_missing'; }).length;
        var unreplied = lPeriodRevs.filter(isUnrepliedGoogleReview).length;
        var overdue = lPeriodRevs.filter(function (r) { return r.slaOverdue; }).length;

        var ratedInPeriod = lPeriodRevs.filter(function (r) { return r.rating != null && r.rating >= 1 && r.rating <= 5; });
        var periodAvg = ratedInPeriod.length ? (ratedInPeriod.reduce(function (s, r) { return s + r.rating; }, 0) / ratedInPeriod.length) : null;

        return Object.assign({}, loc, {
          periodReviews: lPeriodRevs.length,
          periodAvgRating: periodAvg != null ? Math.round(periodAvg * 100) / 100 : null,
          reviewsWithPhoto: photoCount,
          reviewsWithTextOnly: textOnlyCount,
          reviewsRatingOnly: ratingOnlyCount,
          reviewsTextAndEmpty: textOnlyCount + ratingOnlyCount,
          reviewsSuspectedMissing: missingCount,
          unrepliedCount: unreplied,
          overdueCount: overdue,
          totalPoolReviews: lRevs.length
        });
      });

      // Áp dụng bộ lọc
      var q = (sp.get('q') || '').trim().toLowerCase();
      if (q) {
        locItems = locItems.filter(function (l) {
          return l.displayName.toLowerCase().includes(q) || l.fullName.toLowerCase().includes(q) || l.branchCode.toLowerCase().includes(q) || l.address.toLowerCase().includes(q) || l.placeId.toLowerCase().includes(q);
        });
      }

      var statusFilter = sp.get('status');
      if (statusFilter === 'active' || statusFilter === 'open') {
        locItems = locItems.filter(function (l) { return l.businessStatus === 'OPEN'; });
      } else if (statusFilter === 'closed') {
        locItems = locItems.filter(function (l) { return l.businessStatus !== 'OPEN'; });
      } else if (statusFilter === 'low_rating') {
        locItems = locItems.filter(function (l) { return l.googleRating < 4.85; });
      }

      var groupFilter = sp.get('group');
      if (groupFilter && groupFilter !== 'all') {
        locItems = locItems.filter(function (l) { return l.groups && l.groups.includes(groupFilter); });
      }

      // TÍNH TOÁN DÒNG TỔNG CHUẨN XÁC THEO TRỌNG SỐ (Fix E3)
      var totalReviewsSum = locItems.reduce(function (s, l) { return s + l.googleTotalReviews; }, 0);
      var weightedSum = locItems.reduce(function (s, l) { return s + (l.googleRating * l.googleTotalReviews); }, 0);
      var weightedAvg = totalReviewsSum > 0 ? (weightedSum / totalReviewsSum) : null;

      var summary = {
        count: locItems.length,
        weightedRating: weightedAvg != null ? Math.round(weightedAvg * 100) / 100 : null,
        avgRating: weightedAvg != null ? Math.round(weightedAvg * 100) / 100 : null,
        totalPhotos: locItems.reduce(function (s, l) { return s + l.reviewsWithPhoto; }, 0),
        photoReviews: locItems.reduce(function (s, l) { return s + l.reviewsWithPhoto; }, 0),
        totalTextAndEmpty: locItems.reduce(function (s, l) { return s + l.reviewsTextAndEmpty; }, 0),
        textOnlyReviews: locItems.reduce(function (s, l) { return s + l.reviewsTextAndEmpty; }, 0),
        totalPeriodReviews: locItems.reduce(function (s, l) { return s + l.periodReviews; }, 0),
        totalGoogleReviews: totalReviewsSum,
        totalMissing: locItems.reduce(function (s, l) { return s + l.reviewsSuspectedMissing; }, 0),
        suspectedMissing: locItems.reduce(function (s, l) { return s + l.reviewsSuspectedMissing; }, 0),
        totalUnreplied: locItems.reduce(function (s, l) { return s + l.unrepliedCount; }, 0),
        totalOverdue: locItems.reduce(function (s, l) { return s + l.overdueCount; }, 0)
      };
      return J({
        total: locItems.length,
        items: locItems,
        summary: summary
      });
    }

    // --- ENDPOINT: LOCATION GROUPS (PHẦN G - ĐỊNH DANH ID ỔN ĐỊNH & PHÂN BIỆT RÕ RÀNG) ---
    if (ep === 'location_groups') {
      if (typeof loadPersistedSmartGroups === 'function') loadPersistedSmartGroups();
      var brandLocs = getBrandLocations(b);
      var groupsList = [];

      // 1. Nhóm tĩnh chuẩn: Toàn bộ chi nhánh
      groupsList.push({
        id: 'grp_all',
        name: 'Toàn bộ chi nhánh (' + brandLocs.length + ')',
        type: 'static',
        locationCount: brandLocs.length,
        locations: brandLocs.map(function (l) { return l.locationId; }),
        manager: 'Ban Giám Đốc',
        lastEvaluatedAt: new Date().toISOString()
      });

      // 2. Nhóm tĩnh theo vùng miền địa lý (dùng ID ổn định duy nhất)
      var regionsMap = {};
      brandLocs.forEach(function (loc) {
        var reg = loc.region || loc.province || 'Khu vực chính';
        if (!regionsMap[reg]) regionsMap[reg] = [];
        regionsMap[reg].push(loc);
      });
      Object.keys(regionsMap).forEach(function (regName) {
        var locs = regionsMap[regName];
        var regId = 'grp_reg_' + regName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        groupsList.push({
          id: regId,
          name: 'Vùng ' + regName,
          type: 'static',
          locationCount: locs.length,
          locations: locs.map(function (l) { return l.locationId; }),
          manager: locs[0] ? (locs[0].manager || 'Quản lý Vùng') : 'Quản lý Vùng',
          lastEvaluatedAt: new Date().toISOString()
        });
      });

      // 3. Nhóm động (Smart Groups) - TÍNH TOÁN LẠI ĐIỀU KIỆN ĐỘNG TRỰC TIẾP (BẢO VỆ CHỐNG TRÙNG ID TĨNH)
      var bSmart = (window.SHARED_SMART_GROUPS && window.SHARED_SMART_GROUPS[b]) || {};
      // Loại bỏ mọi key mang ID tĩnh được bảo lưu
      delete bSmart['grp_all'];
      delete bSmart['all'];
      Object.keys(bSmart).forEach(function (k) {
        if (String(k).indexOf('grp_reg_') === 0) delete bSmart[k];
      });

      Object.keys(bSmart).forEach(function (sId) {
        var sg = bSmart[sId];
        var matching = brandLocs.filter(function (l) {
          return evalSmartGroupConditions(l, sg.conditions, sg.logic);
        });
        var matchingIds = matching.map(function (l) { return l.locationId; });
        sg.matchingLocations = matchingIds;
        sg.locationCount = matchingIds.length;
        sg.matchedCount = matchingIds.length;

        groupsList.push({
          id: sId,
          name: sg.name || sId,
          type: 'smart',
          conditions: sg.conditions || [],
          logic: sg.logic || 'AND',
          locationCount: matchingIds.length,
          locations: matchingIds,
          manager: 'Hệ thống Quy tắc Thông minh',
          lastEvaluatedAt: new Date().toISOString()
        });
      });

      return J({ groups: groupsList });
    }

    // --- ENDPOINT: LOCAL RANK (PHẦN I) ---
    if (ep === 'local_rank') {
      var brandLocs = getBrandLocations(b);
      var bConfig = getBrandConfig(b);
      var targetLoc = brandLocs[0] || { displayName: bConfig.name, address: 'TP.HCM' };
      var keywords = [];

      if (bConfig.industry === 'f_and_b') {
        keywords = [
          { keyword: 'lẩu ngon sài gòn gần đây', position: 2, top3: true, top10: true, change: +1, verifiedAt: '2026-10-15T08:00:00Z', searchEngine: 'Google Local Pack', checkCost: '$0.002' },
          { keyword: 'buffet lẩu nướng giá tốt', position: 1, top3: true, top10: true, change: 0, verifiedAt: '2026-10-15T08:00:00Z', searchEngine: 'Google Local Pack', checkCost: '$0.002' },
          { keyword: 'quán lẩu bò mỹ quận 10', position: 3, top3: true, top10: true, change: +1, verifiedAt: '2026-10-15T08:00:00Z', searchEngine: 'Google Local Pack', checkCost: '$0.002' },
          { keyword: 'đặt bàn lẩu nấm gia đình', position: 5, top3: false, top10: true, change: -1, verifiedAt: '2026-10-15T08:00:00Z', searchEngine: 'Google Local Pack', checkCost: '$0.002' },
          { keyword: 'nhà hàng lẩu ngon phú nhuận', position: null, notFoundInTop20: true, top3: false, top10: false, change: null, verifiedAt: '2026-10-15T08:00:00Z', searchEngine: 'Google Local Pack', checkCost: '$0.002' }
        ];
      } else if (bConfig.industry === 'retail_ecommerce') {
        keywords = [
          { keyword: 'cửa hàng laptop uy tín gần đây', position: 2, top3: true, top10: true, change: +1, verifiedAt: '2026-10-15T08:00:00Z', searchEngine: 'Google Local Pack', checkCost: '$0.002' },
          { keyword: 'mua điện thoại chính hãng giá rẻ', position: 3, top3: true, top10: true, change: 0, verifiedAt: '2026-10-15T08:00:00Z', searchEngine: 'Google Local Pack', checkCost: '$0.002' },
          { keyword: 'linh kiện máy tính hà nội', position: 1, top3: true, top10: true, change: +1, verifiedAt: '2026-10-15T08:00:00Z', searchEngine: 'Google Local Pack', checkCost: '$0.002' },
          { keyword: 'bảo hành thiết bị công nghệ', position: 6, top3: false, top10: true, change: -2, verifiedAt: '2026-10-15T08:00:00Z', searchEngine: 'Google Local Pack', checkCost: '$0.002' },
          { keyword: 'cửa hàng điện máy quận 1', position: null, notFoundInTop20: true, top3: false, top10: false, change: null, verifiedAt: '2026-10-15T08:00:00Z', searchEngine: 'Google Local Pack', checkCost: '$0.002' }
        ];
      } else if (bConfig.industry === 'aesthetic_clinic' || bConfig.industry === 'medical' || bConfig.industry === 'beauty') {
        keywords = [
          { keyword: 'thẩm mỹ viện uy tín gần đây', position: 2, top3: true, top10: true, change: +1, verifiedAt: '2026-10-15T08:00:00Z', searchEngine: 'Google Local Pack', checkCost: '$0.002' },
          { keyword: 'chăm sóc da chuyên sâu', position: 1, top3: true, top10: true, change: 0, verifiedAt: '2026-10-15T08:00:00Z', searchEngine: 'Google Local Pack', checkCost: '$0.002' },
          { keyword: 'phòng khám da liễu trị mụn', position: 4, top3: false, top10: true, change: -1, verifiedAt: '2026-10-15T08:00:00Z', searchEngine: 'Google Local Pack', checkCost: '$0.002' },
          { keyword: 'bác sĩ da liễu giỏi tphcm', position: 8, top3: false, top10: true, change: +2, verifiedAt: '2026-10-15T08:00:00Z', searchEngine: 'Google Local Pack', checkCost: '$0.002' },
          { keyword: 'địa chỉ làm đẹp uy tín', position: null, notFoundInTop20: true, top3: false, top10: false, change: null, verifiedAt: '2026-10-15T08:00:00Z', searchEngine: 'Google Local Pack', checkCost: '$0.002' }
        ];
      } else {
        // Ngành generic hoặc ngành chưa thiết lập từ khóa theo dõi
        keywords = [];
      }

      var validRanked = keywords.filter(function (k) { return k.position != null; });
      var avgRank = validRanked.length ? (validRanked.reduce(function (s, k) { return s + k.position; }, 0) / validRanked.length).toFixed(1) : null;
      var top3Count = keywords.filter(function (k) { return k.top3; }).length;

      return J({
        locationId: targetLoc.locationId,
        locationName: targetLoc.displayName,
        address: targetLoc.address,
        averageRank: avgRank ? Number(avgRank) : null,
        top3Count: top3Count,
        totalKeywordsTracked: keywords.length,
        trackedKeywordsCount: keywords.length,
        keywords: keywords,
        lastCheckedAt: '2026-10-15T08:00:00Z',
        isMockSerp: true
      });
    }

    if (ep === 'posts') {
      var posts = [
        {
          id: 'post_01',
          title: 'Ưu đãi tri ân khách hàng tháng 10',
          type: 'OFFER',
          summary: 'Trải nghiệm dịch vụ chăm sóc cao cấp với ưu đãi đặc quyền 30% trong tháng 10.',
          cta: { action: 'GET_OFFER', url: 'https://example.com/uu-dai' },
          status: 'published',
          publishedAt: '2026-10-10T09:00:00Z',
          targetLocations: ['all'],
          results: [{ locationId: 'all', status: 'published', googlePostId: 'localPosts/12345' }]
        },
        {
          id: 'post_02',
          title: 'Hội thảo Y khoa: Ứng dụng Laser thế hệ mới',
          type: 'EVENT',
          summary: 'Gặp gỡ đội ngũ bác sĩ chuyên khoa và nhận tư vấn phác đồ chuyên sâu miễn phí.',
          cta: { action: 'BOOK', url: 'https://example.com/dat-lich' },
          status: 'approved',
          scheduledFor: '2026-10-25T14:00:00Z',
          targetLocations: ['loc_sc_binh_thanh', 'loc_sc_q10'],
          results: []
        }
      ];
      return J({ posts: posts });
    }

    // --- ENDPOINT: MEDIA (THƯ VIỆN HÌNH ẢNH - PHẦN K) ---
    if (ep === 'media') {
      var brandLocs = getBrandLocations(b);
      var assets = [
        { id: 'med_01', title: 'Ảnh Mặt tiền Chi nhánh Bình Thạnh', category: 'location_profile', subcategory: 'EXTERIOR', url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800', uploadedAt: '2026-09-15', fileSize: '1.2 MB', attribution: 'Doanh nghiệp sở hữu' },
        { id: 'med_02', title: 'Khu vực Tiếp đón Khách hàng Q.10', category: 'location_profile', subcategory: 'INTERIOR', url: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800', uploadedAt: '2026-09-20', fileSize: '1.8 MB', attribution: 'Doanh nghiệp sở hữu' },
        { id: 'med_03', title: 'Banner Chiến dịch Nhận diện Thương hiệu', category: 'brand_asset', subcategory: 'LOGO_BANNER', url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800', uploadedAt: '2026-10-01', fileSize: '850 KB', attribution: 'Doanh nghiệp sở hữu' },
        { id: 'med_04', title: 'Ảnh trải nghiệm của khách (Review #tz-3)', category: 'customer_review', subcategory: 'CUSTOMER', url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800', uploadedAt: '2026-10-12', fileSize: '950 KB', attribution: 'Khách hàng đăng tải (Chỉ đọc, không sử dụng thương mại nếu chưa xin phép)' }
      ];
      return J({ assets: assets });
    }

    // --- ENDPOINT: OVERVIEW (TỔNG QUAN HỆ THỐNG - FIX B1 ĐỒNG BỘ 100%) ---
    if (ep === 'overview') {
      var dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      periodRevs.forEach(function (r) {
        if (r.rating != null && dist[r.rating] !== undefined) dist[r.rating]++;
      });

      var branchNames = Array.from(new Set(pool.map(function (r) { return r.branch; }).filter(Boolean)));
      var branches = branchNames.map(function (br) {
        var brRevs = periodRevs.filter(function (r) { return r.branch === br; });
        var brRated = brRevs.filter(function (r) { return r.rating != null && r.rating >= 1 && r.rating <= 5; });
        var brAvg = brRated.length ? (brRated.reduce(function (s, r) { return s + r.rating; }, 0) / brRated.length) : null;
        return {
          branch: br,
          total: brRevs.length,
          n: brRevs.length,
          avg: brAvg != null ? Math.round(brAvg * 100) / 100 : null,
          negative: brRevs.filter(function (r) { return (r.rating != null && r.rating <= 2) || (r.rating == null && r.analysis && r.analysis.sentiment === 'negative'); }).length,
          oneStar: brRevs.filter(function (r) { return r.rating === 1; }).length
        };
      });

      var brandLocs = getBrandLocations(b);
      var bConfig = getBrandConfig(b);
      var healthCalc = calcBrandHealth(pool, bConfig, days);

      // NHÓM B: MỨC HOÀN THIỆN HỒ SƠ (YÊU CẦU 1 & 2)
      var locCompletenessList = brandLocs.map(function (l) {
        return Object.assign({}, l, { completeness: calcProfileCompleteness(l, bConfig.industry) });
      });
      var avgCompleteness = locCompletenessList.length ? Math.round(locCompletenessList.reduce(function (s, l) { return s + l.completeness.percentage; }, 0) / locCompletenessList.length) : null;
      var incompleteLocs = locCompletenessList.filter(function (l) { return l.completeness.percentage < 85; });

      // NHÓM C: HIỆU QUẢ HIỆN DIỆN VÀ VẬN HÀNH (YÊU CẦU 1 & 2)
      var performanceCalc = calcBrandPerformance(b, days);

      // Top search queries by industry
      var topQueries = [];
      if (bConfig.industry === 'f_and_b') {
        topQueries = [
          { query: 'lẩu ngon quận 10', impressions: 12400, share: 29.9 },
          { query: 'golden hotpot menu giá', impressions: 8900, share: 21.5 },
          { query: 'buffet lẩu bò sài gòn', impressions: 7200, share: 17.4 },
          { query: 'quán lẩu nấm ngon gần đây', impressions: 5100, share: 12.3 }
        ];
      } else if (bConfig.industry === 'retail_ecommerce') {
        topQueries = [
          { query: 'techzone hà nội', impressions: 14200, share: 31.2 },
          { query: 'laptop gaming giá tốt', impressions: 9800, share: 21.5 },
          { query: 'điện thoại chính hãng uy tín', impressions: 7600, share: 16.7 },
          { query: 'mua tai nghe bluetooth chính hãng', impressions: 4900, share: 10.8 }
        ];
      } else {
        topQueries = [
          { query: 'thẩm mỹ viện quận 10', impressions: 12400, share: 29.9 },
          { query: 'nâng mũi hàn quốc uy tín', impressions: 8900, share: 21.5 },
          { query: 'seoul center bình thạnh', impressions: 7200, share: 17.4 },
          { query: 'chăm sóc da trị mụn chuyên sâu', impressions: 5100, share: 12.3 }
        ];
      }
      performanceCalc.topSearchQueries = topQueries;

      // TRIAGE COUNTERS (VIỆC CẦN XỬ LÝ)
      var unrepliedCount = pool.filter(isUnrepliedGoogleReview).length;
      var overdueCount = pool.filter(function (r) { return r.slaOverdue; }).length;

      var compScore = avgCompleteness;
      var compCompleted = compScore != null ? Math.round((compScore / 100) * 8) : null;
      var compTotal = brandLocs.length > 0 ? 8 : 0;
      var compMissing = (compScore != null && compCompleted != null) ? Math.max(0, compTotal - compCompleted) : null;

      return J({
        days: days,
        kpi: {
          reviews: total,
          reviewsPrev: prevTotal > 0 ? prevTotal : null,
          avgRating: avg != null ? Math.round(avg * 100) / 100 : null,
          avgRatingPrev: prevAvg != null ? Math.round(prevAvg * 100) / 100 : null,
          negative: negCount,
          negativePrev: prevTotal > 0 ? prevNeg : null,
          negShare: total > 0 ? Math.round((negCount / total) * 1000) / 1000 : 0,
          oneStar: periodRevs.filter(function (r) { return r.rating === 1; }).length,
          googleTotal: bConfig.google ? bConfig.google.total : ratedRevs.length,
          googleAvg: bConfig.google ? bConfig.google.rating : (avg != null ? Math.round(avg * 10) / 10 : null),
          // true = điểm tổng trên Google Maps (server lấy từ trang địa điểm); false = điểm TB của review trong kỳ
          googleFromPlace: !!bConfig.google
        },
        health: healthCalc, // Nhóm A: Sức khỏe danh tiếng
        profileCompleteness: { // Nhóm B: Mức hoàn thiện hồ sơ (Thống nhất đầy đủ cả 2 chuẩn trường)
          averagePercentage: avgCompleteness,
          displayPercentage: avgCompleteness != null ? (avgCompleteness + '%') : 'Chưa đủ dữ liệu',
          completenessScore: compScore,
          completedCount: compCompleted,
          totalApplicableCount: compTotal,
          applicableCount: compTotal,
          missingCount: compMissing,
          unknownCount: 0,
          incompleteLocationsCount: incompleteLocs.length,
          totalLocationsCount: brandLocs.length,
          status: avgCompleteness == null ? 'insufficient_data' : (avgCompleteness >= 90 ? 'Tốt' : 'Cần tối ưu')
        },
        presencePerformance: performanceCalc, // Nhóm C: Hiệu quả hiện diện
        fleet: {
          total: brandLocs.length,
          connected: brandLocs.filter(isLocationConnected).length,
          open: brandLocs.filter(isLocationOpen).length,
          disconnected: brandLocs.filter(function (l) { return !isLocationConnected(l); }).length
        },
        triage: {
          unreplied: unrepliedCount,
          overdue: overdueCount,
          negative: negCount,
          incompleteProfiles: incompleteLocs.length,
          failedPosts: 1,
          upcomingCalendar: 2
        },
        dist: dist,
        branches: branches,
        performance: performanceCalc
      });
    }

    if (ep === 'ai_prompts') {
      var prompts = [
        {
          id: 'pr_01',
          title: 'Xử lý khiếu nại dịch vụ & Trấn an khách hàng',
          purpose: 'review_reply',
          tone: 'Đồng cảm & Chân thành',
          version: 'v2.1',
          author: 'Đội ngũ CSKH Thương hiệu',
          active: true,
          template: 'Chào {{author}}, em rất tiếc khi trải nghiệm tại {{location_name}} chưa trọn vẹn. Chúng em đã rà soát lại ca dịch vụ ngày {{date}} và xin tiếp thu để cải thiện chu đáo hơn.'
        },
        {
          id: 'pr_02',
          title: 'Phản hồi Review 5 sao & Giữ chân khách hàng thân thiết',
          purpose: 'review_reply',
          tone: 'Ấm áp & Chuyên nghiệp',
          version: 'v1.4',
          author: 'Ban Giám đốc',
          active: true,
          template: 'Kính chào Quý khách {{author}}, {{brand_name}} chân thành cảm ơn đánh giá 5 sao tuyệt vời của Quý khách dành cho đội ngũ tại {{location_name}}!'
        },
        {
          id: 'pr_03',
          title: 'Soạn thảo bài đăng Google Cập nhật / Ưu đãi định kỳ',
          purpose: 'post_copy',
          tone: 'Chuyên nghiệp & Kêu gọi hành động',
          version: 'v1.0',
          author: 'Marketing Team',
          active: true,
          template: 'Khám phá giải pháp công nghệ cao tại {{location_name}} ({{address}}). Hotline tư vấn: {{hotline}}. Đặt lịch ngay: {{booking_link}}'
        }
      ];
      return J({ prompts: prompts });
    }

    // --- ENDPOINT: UNIFIED WATCHLIST & CRISIS ALERTS (YÊU CẦU 9) ---
    if (ep === 'alerts') {
      var bAlerts = (SHARED_ALERTS && SHARED_ALERTS[b]) || [];
      return J({
        alerts: bAlerts,
        total: bAlerts.length,
        totalCount: bAlerts.length
      });
    }

    if (ep === 'rbac') {
      return J({
        currentUser: {
          name: 'Nguyễn Văn Quản Trị',
          email: 'admin@seoulcenter.vn',
          role: 'Brand Manager',
          scopes: ['all_locations'],
          permissions: ['view', 'edit_profile', 'compose_post', 'approve_post', 'publish_post', 'view_reports']
        },
        rolesMatrix: [
          { role: 'Admin', description: 'Toàn quyền cấu hình, API, phân quyền, kết nối', actions: ['all'] },
          { role: 'Brand Manager', description: 'Quản lý toàn bộ thương hiệu, duyệt bài, duyệt phản hồi nhạy cảm', actions: ['view', 'edit_profile', 'compose_post', 'approve_post', 'publish_post', 'manage_alerts'] },
          { role: 'Location Manager', description: 'Quản lý cơ sở được giao, soạn bài, sửa hồ sơ địa phương', actions: ['view', 'edit_profile', 'compose_post', 'reply_review'] },
          { role: 'Review Operator', description: 'Xem và tạo bản nháp phản hồi review cho cơ sở được giao', actions: ['view', 'draft_reply'] }
        ],
        quotas: {
          productPlan: {
            name: 'Gói Doanh nghiệp Đa chi nhánh (Enterprise)',
            maxLocations: 10,
            usedLocations: 3,
            maxAiDraftsPerMonth: 500,
            usedAiDraftsThisMonth: 46
          },
          googleCloudQuota: {
            api: 'Google Maps Places & GBP API',
            monthlyCap: 10000,
            usedThisMonth: 285,
            percentageUsed: '2.85%'
          },
          llmTokenBudget: {
            model: 'Gemini 2.5 Flash',
            monthlyBudgetUSD: 5.00,
            usedBudgetUSD: 0.0034,
            totalTokensUsed: 34200
          }
        }
      });
    }

    // --- ENDPOINT: DUAL-MODE QR CODE (YÊU CẦU 11) ---
    if (ep === 'qr') {
      var targetLocId = url.searchParams.get('locationId') || 'loc_sc_binh_thanh';
      var loc = SHARED_LOCATIONS.find(function (l) { return l.locationId === targetLocId; }) || SHARED_LOCATIONS[0];
      return J({
        locationId: loc.locationId,
        displayName: loc.displayName,
        directGoogleUrl: 'https://search.google.com/local/writereview?placeid=' + loc.placeId,
        trackedSystemUrl: 'https://checkbrand.vn/r/' + loc.locationId + '?source=in_store_table&camp=2026',
        trackingStats: {
          totalScans: 142,
          uniqueVisitorsEstimate: 98,
          botScansFiltered: 12,
          averageDailyScans: 4.7
        },
        notice: 'Chế độ trực tiếp mở thẳng Google Maps không lưu cookie; Chế độ qua liên kết hệ thống ghi nhận lượt quét (lọc bot tự động) trước khi chuyển hướng.'
      });
    }

    if (ep === 'reputation') {
      var bConfig = getBrandConfig(b);
      var curHealth = calcBrandHealth(pool, bConfig, 30);
      var snapshots = [];

      if (curHealth.score != null) {
        snapshots.push({
          date: '2026-10-15',
          health: curHealth.score,
          avgRating: avg != null ? Math.round(avg * 100) / 100 : null,
          reviews: pool.length,
          source: 'Snapshot định kỳ 15/10/2026',
          formulaVersion: 'v2.0'
        });
      }

      return J({
        snapshots: snapshots,
        weekly: weeklyList,
        table: [{
          id: 'self',
          name: bConfig.name,
          avg90: avg != null ? Math.round(avg * 100) / 100 : null,
          vol30: total,
          volPrev30: prevTotal > 0 ? prevTotal : null,
          negShare30: total > 0 ? Math.round((negCount / total) * 1000) / 1000 : 0,
          googleTotal: ratedRevs.length,
          googleRating: avg != null ? Math.round(avg * 10) / 10 : null
        }],
        prev: curHealth.prev,
        lastCompetitorSync: '2026-10-15T09:00:00Z',
        syncLog: [
          { at: '2026-10-15T09:00:00Z', mode: 'serpapi', added: pool.length, analyzed: pool.length, alerts: negCount, notes: ['Đồng bộ dữ liệu thành công'] }
        ]
      });
    }

    // --- ENDPOINT: SENTIMENT ---
    if (ep === 'sentiment') {
      return J({
        days: days,
        counts: { positive: total - negCount, neutral: 0, negative: negCount, total: total },
        branches: [],
        lang: { vi: total },
        weekly: weeklyList,
        llm: 0,
        total: total
      });
    }

    // --- ENDPOINT: TOPICS ---
    // --- ENDPOINT: SHARE OF VOICE (SOV) ---
    if (ep === 'sov') {
      var sovKey = '/api/' + b + '/sov';
      var rawSov = D.stat && D.stat[sovKey];
      var bCfg = getBrandConfig(b);
      var bPool = (D.rev[b] && D.rev[b].pool) || [];
      var mySov = bCfg.sov || 65;
      var comp1 = Math.round((100 - mySov) * 0.6);
      var comp2 = Math.max(5, 100 - mySov - comp1);
      var myRevCount = bPool.length || bCfg.reviews || 80;

      if (rawSov) {
        var parsed = typeof rawSov === 'string' ? JSON.parse(rawSov) : Object.assign({}, rawSov);
        if (!parsed.shares || !parsed.volume) {
          parsed.shares = [
            { l: bCfg.name, v: mySov, c: '--series-1' },
            { l: 'Đối thủ ngành 1', v: comp1, c: '--series-2' },
            { l: 'Đối thủ ngành 2', v: comp2, c: '--series-3' }
          ];
          parsed.volume = [
            { l: bCfg.name, v: myRevCount },
            { l: 'Đối thủ ngành 1', v: Math.round(myRevCount * 0.75) },
            { l: 'Đối thủ ngành 2', v: Math.round(myRevCount * 0.5) }
          ];
        }
        return J(parsed);
      }

      var mockSov = {
        entities: [
          { id: 'self', name: bCfg.name },
          { id: 'cmp-1', name: 'Đối thủ ngành 1' },
          { id: 'cmp-2', name: 'Đối thủ ngành 2' }
        ],
        shares: [
          { l: bCfg.name, v: mySov, c: '--series-1' },
          { l: 'Đối thủ ngành 1', v: comp1, c: '--series-2' },
          { l: 'Đối thủ ngành 2', v: comp2, c: '--series-3' }
        ],
        volume: [
          { l: bCfg.name, v: myRevCount },
          { l: 'Đối thủ ngành 1', v: Math.round(myRevCount * 0.75) },
          { l: 'Đối thủ ngành 2', v: Math.round(myRevCount * 0.5) }
        ],
        table: [
          { id: 'self', name: bCfg.name, avg90: bCfg.rating || 4.7, vol30: myRevCount, volPrev30: Math.round(myRevCount * 0.9), negShare30: 0.05, googleTotal: myRevCount * 12, googleRating: bCfg.rating || 4.7 },
          { id: 'cmp-1', name: 'Đối thủ ngành 1', avg90: 4.2, vol30: Math.round(myRevCount * 0.75), volPrev30: Math.round(myRevCount * 0.7), negShare30: 0.12, googleTotal: Math.round(myRevCount * 8), googleRating: 4.2 },
          { id: 'cmp-2', name: 'Đối thủ ngành 2', avg90: 4.1, vol30: Math.round(myRevCount * 0.5), volPrev30: Math.round(myRevCount * 0.5), negShare30: 0.15, googleTotal: Math.round(myRevCount * 6), googleRating: 4.1 }
        ],
        items: [],
        keywords: bCfg.industry === 'f_and_b' ? ['lẩu ngon sài gòn', 'buffet lẩu nướng', 'golden hotpot'] : (bCfg.industry === 'retail_ecommerce' ? ['điện thoại chính hãng', 'laptop gaming', 'techzone store'] : ['thẩm mỹ viện uy tín', 'chăm sóc da']),
        formulaVersion: '2.0'
      };
      return J(mockSov);
    }

    // --- ENDPOINT: BÁO CÁO (REPORTS) ---
    if (ep === 'reports') {
      var repKey = '/api/' + b + '/reports';
      var rawRep = D.stat && D.stat[repKey];
      if (rawRep) {
        return J(typeof rawRep === 'string' ? JSON.parse(rawRep) : rawRep);
      }

      var bCfg = getBrandConfig(b);
      var bPool = (D.rev[b] && D.rev[b].pool) || [];
      var totalB = bPool.length;
      var posB = bPool.filter(function (r) { return (r.rating != null && r.rating >= 4) || (r.analysis && r.analysis.sentiment === 'positive'); }).length;
      var negB = bPool.filter(function (r) { return (r.rating != null && r.rating <= 2) || (r.analysis && r.analysis.sentiment === 'negative'); }).length;
      var avgB = totalB ? (bPool.reduce(function (s, r) { return s + (r.rating || 5); }, 0) / totalB).toFixed(2) : 4.8;

      var mockReports = [
        {
          id: 'rep-' + b + '-m10',
          file: 'BC-' + bCfg.name.replace(/\s+/g, '') + '-Thang10-2026.html',
          title: 'Báo cáo Tổng hợp Tháng 10/2026 (' + bCfg.name + ')',
          periodType: 'month',
          periodStart: '2026-10-01T00:00:00+07:00',
          periodEnd: '2026-10-31T23:59:59+07:00',
          asOf: '2026-10-20T08:00:00+07:00',
          days: 30,
          createdAt: new Date().toISOString(),
          summary: {
            health: 94,
            reviews: totalB,
            avgRating: +avgB,
            positive: posB,
            negative: negB,
            sovSearch: (bCfg.sov || 65) + '%',
            sovNews: '88%',
            topAlert: 'Hệ thống vận hành ổn định, không ghi nhận khủng hoảng truyền thông nghiêm trọng.'
          }
        },
        {
          id: 'rep-' + b + '-30d',
          file: 'BC-' + bCfg.name.replace(/\s+/g, '') + '-30Ngay.html',
          title: 'Báo cáo 30 ngày gần nhất - ' + bCfg.name,
          periodType: 'rolling_30d',
          periodStart: '2026-09-20T00:00:00+07:00',
          periodEnd: '2026-10-20T23:59:59+07:00',
          asOf: '2026-10-20T08:00:00+07:00',
          days: 30,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          summary: {
            health: 92,
            reviews: Math.min(totalB, 45),
            avgRating: +avgB,
            positive: Math.round(posB * 0.8),
            negative: Math.round(negB * 0.8),
            sovSearch: (bCfg.sov || 65) + '%',
            sovNews: '85%',
            topAlert: 'Tỷ lệ phản hồi đúng hạn đạt trên 95%.'
          }
        }
      ];
      return J({ reports: mockReports });
    }

    if (ep === 'topics') {
      var bConfig = getBrandConfig(b);
      var indPack = getIndustryPack(bConfig.industry);
      var topicKeys = Object.keys(indPack.topics || {});

      var topicStats = topicKeys.map(function (tk) {
        var tkKeywords = (indPack.keywords && indPack.keywords[tk]) || [];
        var matchingRevs = periodRevs.filter(function (r) {
          if (r.analysis && r.analysis.topics && r.analysis.topics.includes(tk)) return true;
          return matchWords(r.text, tkKeywords);
        });
        var pos = matchingRevs.filter(function (r) {
          return (r.rating != null && r.rating >= 4) || (r.rating == null && r.analysis && r.analysis.sentiment === 'positive');
        }).length;
        var neg = matchingRevs.filter(function (r) {
          return (r.rating != null && r.rating <= 2) || (r.rating == null && r.analysis && r.analysis.sentiment === 'negative');
        }).length;
        var neu = matchingRevs.length - pos - neg;

        return {
          topic: tk,
          label: indPack.topics[tk],
          count: matchingRevs.length,
          positive: pos,
          neutral: Math.max(0, neu),
          negative: neg
        };
      }).filter(function (ts) { return ts.count > 0; });

      return J({ topics: topicStats, total: total });
    }

    // Phục vụ các endpoint khác từ D.stat nếu có
    var key = '/api/' + b + '/' + ep + (url.search || '');
    if (D.stat[key] != null) return J(D.stat[key]);
    if (!url.search) {
      var k2 = Object.keys(D.stat).filter(function (k) { return k.indexOf('/api/' + b + '/' + ep) === 0; })[0];
      if (k2) return J(D.stat[k2]);
    }

    return J({}, 404);
  };

  /* =========================================================================
     LỚP CHUYỂN ĐỔI CHẾ ĐỘ LIVE (khi chạy qua server/ – node server.js)
     - Review pool trong D.rev đã là review THẬT (server nạp vào data/demo-data.js)
     - 'real'  : lấy nguyên kết quả từ server
     - 'merge' : tính bằng mô phỏng trên review thật + ghi đè thông tin đồng bộ từ server
     - 'alerts': cảnh báo thật từ server, đổi sang định dạng giao diện mới
     - 'sov', 'reputation': số liệu thật từ server, bổ sung trường giao diện cần
     - còn lại : mô phỏng (tính trên review thật / dữ liệu server nạp sẵn)
     ========================================================================= */
  var LIVE_REAL = ['sentiment', 'crisis', 'reports'];
  var LIVE_POST = ['sync', 'read', 'reports', 'wfstate'];

  async function jsonOf(resp) { try { return await resp.json(); } catch (e) { return {}; } }

  function mapAlert(a, b) {
    var prefix = String(a.key || '').split(':')[0];
    var types = { sev: 'negative_review', spike: 'negative_spike', drop: 'rating_drop', dup: 'review_attack' };
    var pool = (D.rev[b] && D.rev[b].pool) || [];
    var rv = (a.reviewIds && a.reviewIds[0]) ? pool.find(function (r) { return r.id === a.reviewIds[0]; }) : null;
    var critical = a.level === 'critical';
    return Object.assign({}, a, {
      severity: critical ? 'high' : 'medium',
      priority: critical ? 'CRITICAL' : 'HIGH',
      triggerType: types[prefix] || prefix || 'other',
      location: (rv && rv.branch) || 'Toàn chuỗi',
      scope: rv ? 'location' : 'brand_wide',
      evidence: a.detail || '',
      assignee: a.assignee || '',
      status: a.status || 'new',
      ruleId: 'RUL-' + (prefix || 'GEN').toUpperCase(),
      detectedAt: a.createdAt
    });
  }

  window.fetch = async function (u, opt) {
    if (window.CB_CONFIG.MODE !== 'live') return mockFetch(u, opt);
    var url = new URL(typeof u === 'string' ? u : u.url, location.href);
    var p = url.pathname;
    if (p.indexOf('/api/') !== 0 || p === '/api/config') return realFetch(u, opt);
    var m = p.match(/^\/api\/([\w-]+)\/(\w+)$/);
    var b = m && m[1], ep = m && m[2];
    var method = ((opt && opt.method) || 'GET').toUpperCase();
    if (!ep) return mockFetch(u, opt);

    if (method !== 'GET') return LIVE_POST.indexOf(ep) !== -1 ? realFetch(u, opt) : mockFetch(u, opt);
    if (LIVE_REAL.indexOf(ep) !== -1) return realFetch(u, opt);

    if (ep === 'alerts') {
      var ra = await jsonOf(await realFetch(u, opt));
      var list = (ra.alerts || []).map(function (a) { return mapAlert(a, b); });
      return J({ alerts: list, unread: ra.unread || 0, total: list.length, totalCount: list.length });
    }

    if (ep === 'sov') {
      // Share of Voice THẬT: tỷ trọng hiển thị Google Search/News (SerpApi) + số review 30 ngày của mình và đối thủ
      var rs = await jsonOf(await realFetch(u, opt));
      var colors = ['--series-1', '--series-2', '--series-3'];
      var web = (rs.search && rs.search.web && rs.search.web.shares) || [];
      rs.shares = web.map(function (x, i) {
        return { l: x.name, v: Math.round((x.share || 0) * 1000) / 10, c: x.id === 'other' ? '--neutral' : (colors[i] || '--neutral') };
      });
      rs.volume = (rs.table || []).map(function (t) { return { l: t.name, v: t.vol30 || 0 }; });
      rs.formulaVersion = rs.formulaVersion || 'server';
      return J(rs);
    }

    if (ep === 'reputation') {
      // Lịch sử danh tiếng THẬT: snapshot hằng ngày + bảng đối thủ từ server
      var rr = await jsonOf(await realFetch(u, opt));
      (rr.snapshots || []).forEach(function (sn) {
        sn.source = sn.source || 'Snapshot server (SerpApi)';
        sn.formulaVersion = sn.formulaVersion || 'server';
      });
      return J(rr);
    }

    if (ep === 'overview' || ep === 'reviews') {
      var both = await Promise.all([mockFetch(u, opt).then(jsonOf), realFetch(u, opt).then(jsonOf)]);
      var mk = both[0], rl = both[1];
      var keep = ep === 'overview' ? ['mode', 'lastSync', 'syncLog', 'level', 'unread'] : ['google'];
      keep.forEach(function (k) { if (rl[k] !== undefined) mk[k] = rl[k]; });
      return J(mk);
    }

    return mockFetch(u, opt);
  };
})();
