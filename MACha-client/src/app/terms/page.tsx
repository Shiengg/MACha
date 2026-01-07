'use client';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-8 md:p-12">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Điều Khoản Sử Dụng</h1>
            <p className="text-gray-600">Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          <div className="prose prose-lg max-w-none">
            <div className="mb-8">
              <p className="text-gray-700 leading-relaxed">
                Xin chào và cảm ơn Quý người dùng đã quan tâm đến nền tảng MACha. Trước khi sử dụng dịch vụ, 
                Quý người dùng vui lòng đọc kỹ và đồng ý với các điều khoản sử dụng dưới đây. Việc sử dụng 
                nền tảng MACha đồng nghĩa với việc Quý người dùng đã hiểu và chấp nhận hoàn toàn các điều khoản này.
              </p>
            </div>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-purple-600 pb-2">
                1. ĐIỀU KHOẢN CHUNG
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  <strong>1.1. Định nghĩa:</strong> MACha là nền tảng gây quỹ từ thiện trực tuyến, 
                  nơi người dùng có thể tạo chiến dịch gây quỹ, quyên góp cho các chiến dịch, 
                  và quản lý việc giải ngân tiền quyên góp một cách minh bạch và có kiểm soát.
                </p>
                <p>
                  <strong>1.2. Độ tuổi sử dụng:</strong> Người dùng phải đủ 18 tuổi trở lên và có 
                  đầy đủ năng lực pháp luật để tham gia các giao dịch tài chính.
                </p>
                <p>
                  <strong>1.3. Tài khoản người dùng:</strong> Người dùng có trách nhiệm bảo mật thông tin 
                  tài khoản của mình. Mọi hoạt động diễn ra từ tài khoản của người dùng sẽ được coi là 
                  do chính người dùng thực hiện.
                </p>
                <p>
                  <strong>1.4. Quyền sở hữu trí tuệ:</strong> Tất cả nội dung, logo, giao diện và 
                  phần mềm trên nền tảng MACha đều thuộc quyền sở hữu của MACha và được bảo hộ bởi 
                  pháp luật về sở hữu trí tuệ.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-purple-600 pb-2">
                2. XÁC MINH DANH TÍNH (KYC)
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  <strong>2.1. Yêu cầu xác minh:</strong> Người dùng muốn tạo chiến dịch gây quỹ phải 
                  thực hiện xác minh danh tính (Know Your Customer - KYC) bằng cách cung cấp:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Ảnh mặt trước và mặt sau của CMND/CCCD/Hộ chiếu còn hiệu lực</li>
                  <li>Ảnh selfie để đối chiếu với giấy tờ tùy thân</li>
                  <li>Thông tin cá nhân: họ tên, số CMND/CCCD, ngày sinh, địa chỉ</li>
                  <li>Các tài liệu bổ sung nếu được yêu cầu (ví dụ: mã số thuế, sao kê ngân hàng)</li>
                </ul>
                <p>
                  <strong>2.2. Quy trình xét duyệt:</strong> Hồ sơ KYC sẽ được đội ngũ quản trị viên 
                  xem xét trong vòng tối đa 7 ngày làm việc. Người dùng sẽ nhận được thông báo về 
                  kết quả qua email hoặc thông báo trên nền tảng.
                </p>
                <p>
                  <strong>2.3. Từ chối xác minh:</strong> MACha có quyền từ chối xác minh danh tính 
                  nếu phát hiện thông tin không chính xác, giả mạo, hoặc vi phạm các quy định. 
                  Quyết định này là cuối cùng và không thể khiếu nại.
                </p>
                <p>
                  <strong>2.4. Bảo mật thông tin:</strong> MACha cam kết bảo mật tối đa thông tin cá nhân 
                  của người dùng theo quy định của pháp luật về bảo vệ dữ liệu cá nhân.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-purple-600 pb-2">
                3. TẠO CHIẾN DỊCH GÂY QUỸ
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  <strong>3.1. Điều kiện tạo chiến dịch:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Người dùng phải đã hoàn thành xác minh danh tính (KYC) và có trạng thái "verified"</li>
                  <li>Người dùng không bị khóa tài khoản hoặc vi phạm điều khoản</li>
                  <li>Cung cấp đầy đủ thông tin bắt buộc: tiêu đề, mô tả (tối thiểu 50 ký tự), 
                      mục tiêu quyên góp, danh mục, ngày bắt đầu và kết thúc, hình ảnh banner</li>
                  <li>Cung cấp thông tin liên hệ: họ tên, số điện thoại, email, địa chỉ</li>
                  <li>Xác định các mốc cam kết (milestones) với phần trăm quyên góp và thời gian cam kết</li>
                  <li>Bổ sung lịch trình dự kiến sử dụng tiền quyên góp (nếu có)</li>
                </ul>
                <p>
                  <strong>3.2. Danh mục chiến dịch:</strong> Chiến dịch phải thuộc một trong các danh mục 
                  được phép: Trẻ em, Người già, Người nghèo, Thiên tai, Y tế, Giáo dục, Người khuyết tật, Hoàn cảnh khó khăn,
                  Động vật, Môi trường, Cộng đồng, hoặc Khác.
                </p>
                <p>
                  <strong>3.3. Nội dung chiến dịch:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Nội dung phải chân thực, không được giả mạo hoặc gây hiểu lầm</li>
                  <li>Không được chứa nội dung vi phạm pháp luật, đạo đức, thuần phong mỹ tục</li>
                  <li>Không được quảng cáo sản phẩm, dịch vụ thương mại</li>
                  <li>Không được sử dụng hình ảnh, nội dung vi phạm bản quyền</li>
                  <li>Phải cung cấp tài liệu chứng minh (nếu có) để tăng tính minh bạch</li>
                </ul>
                <p>
                  <strong>3.4. Quy trình duyệt chiến dịch:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Chiến dịch sau khi tạo sẽ ở trạng thái "pending" (chờ duyệt)</li>
                  <li>Đội ngũ quản trị viên sẽ xem xét và quyết định trong vòng tối đa 7 ngày làm việc</li>
                  <li>Chiến dịch có thể được chấp thuận ("active") hoặc từ chối ("rejected") với lý do cụ thể</li>
                  <li>Người tạo chiến dịch sẽ nhận thông báo về kết quả duyệt</li>
                </ul>
                <p>
                  <strong>3.5. Trách nhiệm của người tạo chiến dịch:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Chịu trách nhiệm về tính chân thực của thông tin đã cung cấp</li>
                  <li>Cam kết sử dụng tiền quyên góp đúng mục đích đã công bố</li>
                  <li>Cung cấp báo cáo và cập nhật tiến độ sử dụng tiền cho người quyên góp</li>
                  <li>Chịu trách nhiệm pháp lý nếu vi phạm cam kết hoặc sử dụng sai mục đích</li>
                  <li>Hoàn trả tiền quyên góp nếu chiến dịch bị hủy do vi phạm quy định</li>
                </ul>
                <p>
                  <strong>3.6. Hủy chiến dịch:</strong> Người tạo chiến dịch có thể tự hủy chiến dịch 
                  của mình bất kỳ lúc nào với lý do rõ ràng. Khi chiến dịch bị hủy, các quy định về 
                  hoàn tiền sẽ được áp dụng theo Điều 6.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-purple-600 pb-2">
                4. QUYÊN GÓP (DONATE)
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  <strong>4.1. Điều kiện quyên góp:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Người quyên góp phải có tài khoản trên nền tảng MACha</li>
                  <li>Chỉ có thể quyên góp cho các chiến dịch ở trạng thái "active"</li>
                  <li>Số tiền quyên góp phải lớn hơn 0</li>
                </ul>
                <p>
                  <strong>4.2. Phương thức thanh toán:</strong> MACha hỗ trợ các phương thức thanh toán 
                  thông qua SePay bao gồm: Thẻ tín dụng/Ghi nợ, Chuyển khoản ngân hàng, và Chuyển khoản qua NAPAS.
                </p>
                <p>
                  <strong>4.3. Xác nhận giao dịch:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Giao dịch quyên góp chỉ được xác nhận khi thanh toán thành công</li>
                  <li>Số tiền quyên góp sẽ được cập nhật vào tổng số tiền của chiến dịch ngay sau khi thanh toán thành công</li>
                </ul>
                <p>
                  <strong>4.4. Quyền và nghĩa vụ của người quyên góp:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Người quyên góp có quyền bỏ phiếu (vote) cho các yêu cầu rút tiền của chiến dịch mà họ đã quyên góp</li>
                  <li>Trọng lượng phiếu bầu được tính dựa trên tổng số tiền đã quyên góp cho chiến dịch đó</li>
                  <li>Người quyên góp không thể yêu cầu hoàn tiền tự ý, trừ các trường hợp được quy định tại Điều 6</li>
                  <li>Người quyên góp có trách nhiệm đọc kỹ thông tin chiến dịch trước khi quyên góp</li>
                </ul>
                <p>
                  <strong>4.5. Bảo đảm giao dịch:</strong> MACha cam kết đảm bảo tính bảo mật và an toàn 
                  của mọi giao dịch quyên góp thông qua các công nghệ mã hóa và hệ thống thanh toán được chứng nhận.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-purple-600 pb-2">
                5. RÚT TIỀN VÀ GIẢI NGÂN
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  <strong>5.1. Điều kiện rút tiền:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Chỉ người tạo chiến dịch mới có quyền yêu cầu rút tiền</li>
                  <li>Chiến dịch phải ở trạng thái "active"</li>
                  <li>Số tiền yêu cầu rút không được vượt quá số tiền có sẵn (available amount)</li>
                  <li>Không được có yêu cầu rút tiền nào khác đang chờ xử lý</li>
                  <li>Phải cung cấp lý do rõ ràng cho việc rút tiền (tối thiểu 10 ký tự)</li>
                </ul>
                <p>
                  <strong>5.2. Tính toán số tiền có sẵn:</strong> Số tiền có sẵn được tính bằng công thức: 
                  <em> Số tiền có sẵn = Tổng số tiền đã quyên góp - Tổng số tiền đã được giải ngân</em>
                </p>
                <p>
                  <strong>5.3. Quy trình rút tiền:</strong>
                </p>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>
                    <strong>Giai đoạn 1 - Bỏ phiếu từ người quyên góp:</strong>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>Yêu cầu rút tiền sẽ được gửi đến tất cả người quyên góp của chiến dịch</li>
                      <li>Thời gian bỏ phiếu: 3 ngày kể từ khi yêu cầu được tạo</li>
                      <li>Chỉ những người đã quyên góp (với payment_status = "completed") mới được bỏ phiếu</li>
                      <li>Trọng lượng phiếu bầu = Tổng số tiền đã quyên góp của người đó</li>
                      <li>Người quyên góp có thể bỏ phiếu "approve" (đồng ý) hoặc "reject" (từ chối)</li>
                      <li>Người quyên góp có thể thay đổi phiếu bầu bất kỳ lúc nào trong thời gian bỏ phiếu</li>
                      <li>Kết quả được tính dựa trên phần trăm trọng lượng: Yêu cầu được chấp thuận nếu có ≥50% trọng lượng đồng ý</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Giai đoạn 2 - Xét duyệt bởi quản trị viên:</strong>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>Sau khi kết thúc bỏ phiếu, yêu cầu chuyển sang trạng thái "voting_completed"</li>
                      <li>Quản trị viên sẽ xem xét yêu cầu và có thể chấp thuận ("admin_approved") hoặc từ chối ("admin_rejected")</li>
                      <li>Quản trị viên có thể yêu cầu bổ sung thông tin hoặc tài liệu</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Giai đoạn 3 - Giải ngân:</strong>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>Sau khi được quản trị viên chấp thuận, yêu cầu chuyển sang trạng thái "admin_approved"</li>
                      <li>Hệ thống sẽ thực hiện chuyển khoản qua SePay</li>
                      <li>Sau khi chuyển khoản thành công, yêu cầu chuyển sang trạng thái "released"</li>
                      <li>Người tạo chiến dịch và tất cả người quyên góp sẽ nhận thông báo về việc giải ngân</li>
                    </ul>
                  </li>
                </ol>
                <p>
                  <strong>5.4. Rút tiền tự động theo mốc:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Khi chiến dịch đạt các mốc phần trăm quyên góp đã được đặt ra (milestones), 
                      hệ thống có thể tự động tạo yêu cầu rút tiền</li>
                  <li>Yêu cầu tự động vẫn phải trải qua quy trình bỏ phiếu và xét duyệt như yêu cầu thủ công</li>
                  <li>Khi chiến dịch hết hạn và đạt 100%, hệ thống tự động tạo yêu cầu rút số tiền còn lại</li>
                </ul>
                <p>
                  <strong>5.5. Từ chối yêu cầu rút tiền:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Yêu cầu có thể bị từ chối nếu: không đạt đủ phần trăm đồng ý từ người quyên góp, 
                      không đáp ứng điều kiện xét duyệt, hoặc phát hiện vi phạm</li>
                  <li>Người tạo chiến dịch sẽ nhận thông báo về lý do từ chối</li>
                  <li>Người tạo chiến dịch có thể tạo yêu cầu mới sau khi yêu cầu cũ bị từ chối</li>
                </ul>
                <p>
                  <strong>5.6. Trách nhiệm sử dụng tiền:</strong> Người tạo chiến dịch cam kết sử dụng 
                  tiền đã rút đúng mục đích đã công bố trong chiến dịch và cung cấp báo cáo minh bạch 
                  về việc sử dụng tiền khi được yêu cầu.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-purple-600 pb-2">
                6. CHÍNH SÁCH HOÀN TIỀN
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  <strong>6.1. Nguyên tắc chung:</strong> Việc hoàn tiền chỉ được thực hiện trong các 
                  trường hợp đặc biệt được quy định trong điều khoản này. Người quyên góp không thể 
                  yêu cầu hoàn tiền tự ý sau khi đã quyên góp thành công.
                </p>
                <p>
                  <strong>6.2. Trường hợp chiến dịch bị hủy do vi phạm:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Khi chiến dịch bị hủy do vi phạm quy định hoặc bị người dùng khác báo cáo, 
                      hệ thống sẽ tự động thực hiện hoàn tiền theo tỷ lệ</li>
                  <li>Hệ thống sẽ hủy tất cả các yêu cầu rút tiền đang chờ xử lý</li>
                  <li>Số tiền hoàn lại được tính dựa trên số tiền còn lại trong escrow (chưa được giải ngân)</li>
                </ul>
                <p>
                  <strong>6.3. Hoàn tiền theo tỷ lệ (Proportional Refund):</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Trường hợp chưa rút tiền lần nào:</strong>
                    <ul className="list-circle pl-6 mt-2 space-y-1">
                      <li>Người quyên góp sẽ được hoàn lại 100% số tiền đã quyên góp</li>
                      <li>Quy trình hoàn tiền được thực hiện tự động trong vòng 7 ngày làm việc</li>
                      <li>Người quyên góp sẽ nhận thông báo và email xác nhận</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Trường hợp đã rút tiền một phần:</strong>
                    <ul className="list-circle pl-6 mt-2 space-y-1">
                      <li>Tỷ lệ hoàn tiền = (Số tiền còn lại / Tổng số tiền đã quyên góp) × 100%</li>
                      <li>Người quyên góp sẽ được hoàn lại ngay phần tiền còn lại trong escrow</li>
                      <li>Phần tiền đã được giải ngân sẽ được thu hồi từ người tạo chiến dịch</li>
                      <li>Nếu thu hồi thành công, người quyên góp sẽ được hoàn tiếp phần còn lại</li>
                      <li>MACha không đảm bảo 100% hoàn tiền nếu không thể thu hồi từ người tạo chiến dịch</li>
                    </ul>
                  </li>
                </ul>
                <p>
                  <strong>6.4. Quy trình thu hồi tiền từ người tạo chiến dịch:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>MACha sẽ tạo "Recovery Case" để thu hồi số tiền đã được giải ngân</li>
                  <li>Người tạo chiến dịch sẽ nhận thông báo yêu cầu hoàn trả trong vòng 30 ngày</li>
                  <li>Nếu người tạo chiến dịch không hoàn trả đúng hạn, MACha sẽ áp dụng các biện pháp pháp lý cần thiết</li>
                  <li>Tiền thu hồi được sẽ được phân phối lại cho người quyên góp</li>
                </ul>
                <p>
                  <strong>6.5. Phương thức hoàn tiền:</strong> Tiền hoàn lại sẽ được chuyển về tài khoản 
                  thanh toán ban đầu của người quyên góp thông qua hệ thống SePay trong vòng 7-14 ngày làm việc.
                </p>
                <p>
                  <strong>6.6. Trường hợp không thể hoàn tiền:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Nếu toàn bộ số tiền đã được giải ngân và không thể thu hồi từ người tạo chiến dịch</li>
                  <li>Người quyên góp sẽ được thông báo về tình trạng và các biện pháp pháp lý đang được thực hiện</li>
                  <li>MACha sẽ hỗ trợ tối đa trong khả năng của mình nhưng không chịu trách nhiệm bồi thường</li>
                </ul>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-purple-600 pb-2">
                7. BÁO CÁO VÀ XỬ LÝ VI PHẠM
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  <strong>7.1. Quyền báo cáo:</strong> Người dùng có quyền báo cáo các chiến dịch, bài viết, 
                  bình luận, hoặc người dùng khác nếu phát hiện vi phạm quy định.
                </p>
                <p>
                  <strong>7.2. Các lý do báo cáo:</strong> Spam, nội dung không phù hợp, lừa đảo, giả mạo, 
                  quấy rối, bạo lực, vi phạm bản quyền, thông tin sai lệch, hoặc các vi phạm khác.
                </p>
                <p>
                  <strong>7.3. Quy trình xử lý:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Báo cáo sẽ được đội ngũ quản trị viên xem xét trong vòng 7 ngày làm việc</li>
                  <li>Tùy mức độ vi phạm, có thể áp dụng: cảnh báo, ẩn nội dung, hủy chiến dịch, khóa tài khoản</li>
                  <li>Nếu chiến dịch bị hủy, các quy định về hoàn tiền tại Điều 6 sẽ được áp dụng</li>
                </ul>
                <p>
                  <strong>7.4. Khóa tài khoản:</strong> MACha có quyền khóa tài khoản tạm thời hoặc vĩnh viễn 
                  nếu phát hiện vi phạm nghiêm trọng, gian lận, hoặc vi phạm pháp luật.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-purple-600 pb-2">
                8. QUYỀN VÀ TRÁCH NHIỆM CỦA QUẢN TRỊ VIÊN (ADMIN)
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  <strong>8.1. Định nghĩa và bổ nhiệm:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Quản trị viên (Admin) là những người được chủ sở hữu nền tảng (Owner) bổ nhiệm để quản lý và vận hành nền tảng MACha</li>
                  <li>Chỉ có chủ sở hữu nền tảng mới có quyền tạo, cập nhật, hoặc thu hồi quyền quản trị viên</li>
                  <li>Tài khoản quản trị viên được tự động xác minh (verified) khi được tạo</li>
                  <li>Quản trị viên có thể bị thu hồi quyền hoặc bị khóa tài khoản nếu vi phạm quy định</li>
                </ul>
                <p>
                  <strong>8.2. Quyền hạn của quản trị viên:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Duyệt xác minh danh tính (KYC):</strong>
                    <ul className="list-circle pl-6 mt-2 space-y-1">
                      <li>Xem danh sách các hồ sơ KYC đang chờ duyệt</li>
                      <li>Xem chi tiết thông tin và tài liệu KYC của người dùng</li>
                      <li>Chấp thuận hoặc từ chối hồ sơ KYC với lý do cụ thể</li>
                      <li>Thời gian xét duyệt tối đa: 7 ngày làm việc kể từ khi nhận hồ sơ</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Duyệt chiến dịch gây quỹ:</strong>
                    <ul className="list-circle pl-6 mt-2 space-y-1">
                      <li>Xem danh sách các chiến dịch đang chờ duyệt (pending)</li>
                      <li>Xem chi tiết thông tin, nội dung, và tài liệu của chiến dịch</li>
                      <li>Chấp thuận chiến dịch để chuyển sang trạng thái "active" (hoạt động)</li>
                      <li>Từ chối chiến dịch với lý do cụ thể, chuyển sang trạng thái "rejected"</li>
                      <li>Thời gian xét duyệt tối đa: 7 ngày làm việc kể từ khi chiến dịch được tạo</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Duyệt sự kiện (Events):</strong>
                    <ul className="list-circle pl-6 mt-2 space-y-1">
                      <li>Xem danh sách các sự kiện đang chờ duyệt</li>
                      <li>Xem chi tiết thông tin và nội dung sự kiện</li>
                      <li>Chấp thuận hoặc từ chối sự kiện với lý do cụ thể</li>
                      <li>Thời gian xét duyệt tối đa: 7 ngày làm việc</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Quản lý người dùng:</strong>
                    <ul className="list-circle pl-6 mt-2 space-y-1">
                      <li>Xem danh sách tất cả người dùng trên nền tảng</li>
                      <li>Xem chi tiết thông tin tài khoản, lịch sử hoạt động của người dùng</li>
                      <li>Xem lịch sử KYC và các chiến dịch của người dùng</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Quản lý báo cáo:</strong>
                    <ul className="list-circle pl-6 mt-2 space-y-1">
                      <li>Xem danh sách tất cả các báo cáo từ người dùng</li>
                      <li>Xem chi tiết báo cáo, thông tin người báo cáo và đối tượng bị báo cáo</li>
                      <li>Cập nhật trạng thái xử lý báo cáo: đang xử lý, đã xử lý, từ chối</li>
                      <li>Ghi nhận quyết định xử lý và chi tiết giải quyết</li>
                      <li>Thời gian xử lý báo cáo tối đa: 7 ngày làm việc</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Duyệt yêu cầu rút tiền:</strong>
                    <ul className="list-circle pl-6 mt-2 space-y-1">
                      <li>Xem danh sách các yêu cầu rút tiền đã hoàn thành giai đoạn bỏ phiếu từ người quyên góp</li>
                      <li>Xem chi tiết yêu cầu rút tiền: số tiền, lý do, kết quả bỏ phiếu, thông tin chiến dịch</li>
                      <li>Chấp thuận yêu cầu rút tiền để hệ thống thực hiện giải ngân</li>
                      <li>Từ chối yêu cầu rút tiền với lý do cụ thể nếu phát hiện vi phạm hoặc không đáp ứng điều kiện</li>
                      <li>Yêu cầu bổ sung thông tin hoặc tài liệu từ người tạo chiến dịch nếu cần</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Xem thống kê và báo cáo:</strong>
                    <ul className="list-circle pl-6 mt-2 space-y-1">
                      <li>Truy cập dashboard để xem tổng quan hoạt động của nền tảng</li>
                      <li>Xem thống kê về số lượng người dùng, chiến dịch, sự kiện</li>
                      <li>Xem số lượng các hồ sơ đang chờ duyệt</li>
                    </ul>
                  </li>
                </ul>
                <p>
                  <strong>8.3. Trách nhiệm của quản trị viên:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Xét duyệt công bằng và minh bạch:</strong>
                    <ul className="list-circle pl-6 mt-2 space-y-1">
                      <li>Xem xét kỹ lưỡng tất cả hồ sơ, chiến dịch, sự kiện, và báo cáo một cách công bằng</li>
                      <li>Không được từ chối hoặc chấp thuận dựa trên cảm tính cá nhân</li>
                      <li>Phải cung cấp lý do cụ thể và rõ ràng khi từ chối bất kỳ yêu cầu nào</li>
                      <li>Xử lý trong thời gian quy định (tối đa 7 ngày làm việc)</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Bảo mật thông tin:</strong>
                    <ul className="list-circle pl-6 mt-2 space-y-1">
                      <li>Bảo mật tuyệt đối thông tin cá nhân, tài liệu KYC của người dùng</li>
                      <li>Không được tiết lộ, chia sẻ, hoặc sử dụng thông tin người dùng cho mục đích khác ngoài công việc quản lý</li>
                      <li>Tuân thủ các quy định về bảo vệ dữ liệu cá nhân</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Xử lý báo cáo kịp thời:</strong>
                    <ul className="list-circle pl-6 mt-2 space-y-1">
                      <li>Xem xét và xử lý các báo cáo vi phạm một cách nhanh chóng và công bằng</li>
                      <li>Áp dụng các biện pháp xử lý phù hợp với mức độ vi phạm</li>
                      <li>Ghi nhận đầy đủ quyết định và lý do xử lý</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Kiểm soát chất lượng:</strong>
                    <ul className="list-circle pl-6 mt-2 space-y-1">
                      <li>Đảm bảo các chiến dịch và sự kiện được duyệt đáp ứng đầy đủ tiêu chuẩn về nội dung, tính chân thực, và tuân thủ quy định</li>
                      <li>Ngăn chặn các chiến dịch lừa đảo, giả mạo, hoặc vi phạm pháp luật</li>
                      <li>Bảo vệ quyền lợi của người quyên góp và người tạo chiến dịch</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Giám sát yêu cầu rút tiền:</strong>
                    <ul className="list-circle pl-6 mt-2 space-y-1">
                      <li>Xem xét kỹ lưỡng các yêu cầu rút tiền sau khi đã được người quyên góp bỏ phiếu</li>
                      <li>Đảm bảo yêu cầu rút tiền hợp lệ, đúng mục đích, và tuân thủ quy định</li>
                      <li>Yêu cầu bổ sung thông tin hoặc tài liệu nếu cần thiết</li>
                      <li>Chấp thuận giải ngân chỉ khi đảm bảo tính hợp pháp và minh bạch</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Tuân thủ quy định:</strong>
                    <ul className="list-circle pl-6 mt-2 space-y-1">
                      <li>Tuân thủ nghiêm ngặt các quy định của nền tảng và pháp luật hiện hành</li>
                      <li>Không được lạm dụng quyền hạn để trục lợi cá nhân</li>
                      <li>Không được tạo chiến dịch hoặc tham gia các hoạt động có thể gây xung đột lợi ích</li>
                    </ul>
                  </li>
                </ul>
                <p>
                  <strong>8.4. Giới hạn quyền hạn:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Quản trị viên không có quyền tạo, cập nhật, hoặc xóa tài khoản quản trị viên khác</li>
                  <li>Quản trị viên không có quyền thay đổi cài đặt hệ thống cốt lõi hoặc cấu hình thanh toán</li>
                  <li>Quản trị viên không có quyền truy cập vào thông tin tài chính chi tiết của chủ sở hữu nền tảng</li>
                  <li>Quản trị viên không thể tự mình khóa hoặc xóa tài khoản của chính mình</li>
                </ul>
                <p>
                  <strong>8.5. Vi phạm và xử lý:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Nếu quản trị viên vi phạm quy định, lạm dụng quyền hạn, hoặc có hành vi không phù hợp, chủ sở hữu nền tảng có quyền:</li>
                  <ul className="list-circle pl-6 mt-2 space-y-1">
                    <li>Thu hồi quyền quản trị viên (chuyển role về "user")</li>
                    <li>Khóa tài khoản tạm thời hoặc vĩnh viễn</li>
                    <li>Yêu cầu bồi thường nếu gây thiệt hại</li>
                    <li>Áp dụng các biện pháp pháp lý nếu cần thiết</li>
                  </ul>
                  <li>Mọi quyết định của quản trị viên đều được ghi nhận và có thể được xem xét lại bởi chủ sở hữu nền tảng</li>
                </ul>
                <p>
                  <strong>8.6. Bảo mật tài khoản:</strong> Quản trị viên có trách nhiệm bảo mật tài khoản của mình. 
                  Mọi hoạt động từ tài khoản quản trị viên đều được ghi nhận và chịu trách nhiệm. Nếu phát hiện tài khoản 
                  bị xâm nhập, quản trị viên phải báo cáo ngay lập tức cho chủ sở hữu nền tảng.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-purple-600 pb-2">
                9. TRÁCH NHIỆM VÀ GIỚI HẠN
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  <strong>8.1. Trách nhiệm của MACha:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Duy trì nền tảng hoạt động ổn định và an toàn</li>
                  <li>Bảo vệ thông tin cá nhân của người dùng</li>
                  <li>Xét duyệt và kiểm soát các chiến dịch gây quỹ</li>
                  <li>Hỗ trợ giải quyết tranh chấp trong khả năng của mình</li>
                </ul>
                <p>
                  <strong>8.2. Giới hạn trách nhiệm:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>MACha không chịu trách nhiệm về việc người tạo chiến dịch sử dụng sai mục đích sau khi đã giải ngân</li>
                  <li>MACha không đảm bảo hoàn tiền 100% nếu không thể thu hồi từ người tạo chiến dịch</li>
                  <li>MACha không chịu trách nhiệm về các tổn thất gián tiếp, lợi nhuận bị mất, hoặc thiệt hại khác</li>
                  <li>MACha không đảm bảo tính chính xác tuyệt đối của thông tin do người tạo chiến dịch cung cấp</li>
                </ul>
                <p>
                  <strong>8.3. Trách nhiệm của người dùng:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Chịu trách nhiệm về mọi hoạt động diễn ra từ tài khoản của mình</li>
                  <li>Bảo mật thông tin đăng nhập và không chia sẻ với bên thứ ba</li>
                  <li>Cung cấp thông tin chính xác, trung thực</li>
                  <li>Tuân thủ mọi quy định pháp luật hiện hành</li>
                </ul>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-purple-600 pb-2">
                10. BẢO MẬT VÀ BẢO VỆ DỮ LIỆU
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  <strong>9.1. Bảo vệ thông tin:</strong> MACha cam kết bảo vệ thông tin cá nhân của người dùng 
                  theo quy định của pháp luật về bảo vệ dữ liệu cá nhân. Thông tin sẽ được mã hóa và lưu trữ an toàn.
                </p>
                <p>
                  <strong>9.2. Sử dụng thông tin:</strong> MACha chỉ sử dụng thông tin cá nhân cho mục đích 
                  vận hành nền tảng và không chia sẻ với bên thứ ba mà không có sự đồng ý, trừ các trường hợp 
                  được yêu cầu bởi pháp luật.
                </p>
                <p>
                  <strong>9.3. Bảo mật giao dịch:</strong> Mọi giao dịch tài chính đều được thực hiện thông qua 
                  các hệ thống thanh toán được mã hóa và đạt chuẩn bảo mật quốc tế.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-purple-600 pb-2">
                11. THAY ĐỔI ĐIỀU KHOẢN
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  MACha có quyền thay đổi, bổ sung điều khoản sử dụng bất kỳ lúc nào. Người dùng sẽ được thông báo 
                  về các thay đổi quan trọng qua email hoặc thông báo trên nền tảng. Việc tiếp tục sử dụng dịch vụ 
                  sau khi có thay đổi đồng nghĩa với việc người dùng chấp nhận các điều khoản mới.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-purple-600 pb-2">
                12. GIẢI QUYẾT TRANH CHẤP
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  <strong>11.1. Thương lượng:</strong> Mọi tranh chấp phát sinh sẽ được ưu tiên giải quyết 
                  thông qua thương lượng, hòa giải giữa các bên liên quan.
                </p>
                <p>
                  <strong>11.2. Trọng tài/Tòa án:</strong> Nếu không thể thương lượng, tranh chấp sẽ được 
                  giải quyết tại Tòa án có thẩm quyền tại Việt Nam theo quy định của pháp luật.
                </p>
                <p>
                  <strong>11.3. Luật áp dụng:</strong> Điều khoản này được điều chỉnh và giải thích theo 
                  pháp luật Cộng hòa Xã hội Chủ nghĩa Việt Nam.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-purple-600 pb-2">
                13. LIÊN HỆ
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  Nếu Quý người dùng có bất kỳ câu hỏi hoặc khiếu nại nào liên quan đến điều khoản sử dụng, 
                  vui lòng liên hệ với chúng tôi qua:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Email: support@macha.vn</li>
                  <li>Địa chỉ: [Địa chỉ công ty]</li>
                  <li>Hotline: [Số điện thoại hỗ trợ]</li>
                </ul>
              </div>
            </section>

            <div className="mt-12 p-6 bg-purple-50 rounded-lg border-l-4 border-purple-600">
              <p className="text-gray-800 font-semibold mb-2">
                Bằng việc sử dụng nền tảng MACha, Quý người dùng xác nhận rằng đã đọc, hiểu và đồng ý 
                với tất cả các điều khoản được nêu trong tài liệu này.
              </p>
              <p className="text-gray-600 text-sm mt-2">
                Chúng tôi cam kết tạo ra một môi trường gây quỹ minh bạch, an toàn và hiệu quả cho cộng đồng.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
