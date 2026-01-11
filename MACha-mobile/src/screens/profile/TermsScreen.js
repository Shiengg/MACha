import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function TermsScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Điều khoản sử dụng</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.mainTitle}>Điều Khoản Sử Dụng</Text>
            <Text style={styles.updateDate}>
              Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>

          {/* Introduction */}
          <View style={styles.section}>
            <Text style={styles.introText}>
              Xin chào và cảm ơn Quý người dùng đã quan tâm đến nền tảng MACha. Trước khi sử dụng dịch vụ,
              Quý người dùng vui lòng đọc kỹ và đồng ý với các điều khoản sử dụng dưới đây. Việc sử dụng
              nền tảng MACha đồng nghĩa với việc Quý người dùng đã hiểu và chấp nhận hoàn toàn các điều khoản này.
            </Text>
          </View>

          {/* Section 1 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. ĐIỀU KHOẢN CHUNG</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>1.1. Định nghĩa:</Text> MACha là nền tảng gây quỹ từ thiện trực tuyến,
                nơi người dùng có thể tạo chiến dịch gây quỹ, quyên góp cho các chiến dịch,
                và quản lý việc giải ngân tiền quyên góp một cách minh bạch và có kiểm soát.
              </Text>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>1.2. Độ tuổi sử dụng:</Text> Người dùng phải đủ 18 tuổi trở lên và có
                đầy đủ năng lực pháp luật để tham gia các giao dịch tài chính.
              </Text>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>1.3. Tài khoản người dùng:</Text> Người dùng có trách nhiệm bảo mật thông tin
                tài khoản của mình. Mọi hoạt động diễn ra từ tài khoản của người dùng sẽ được coi là
                do chính người dùng thực hiện.
              </Text>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>1.4. Quyền sở hữu trí tuệ:</Text> Tất cả nội dung, logo, giao diện và
                phần mềm trên nền tảng MACha đều thuộc quyền sở hữu của MACha và được bảo hộ bởi
                pháp luật về sở hữu trí tuệ.
              </Text>
            </View>
          </View>

          {/* Section 2 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. XÁC MINH DANH TÍNH (KYC)</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>2.1. Yêu cầu xác minh:</Text> Người dùng muốn tạo chiến dịch gây quỹ phải
                thực hiện xác minh danh tính (Know Your Customer - KYC) bằng cách cung cấp:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Ảnh mặt trước và mặt sau của CMND/CCCD/Hộ chiếu còn hiệu lực</Text>
                <Text style={styles.bulletItem}>• Ảnh selfie để đối chiếu với giấy tờ tùy thân</Text>
                <Text style={styles.bulletItem}>• Thông tin cá nhân: họ tên, số CMND/CCCD, ngày sinh, địa chỉ</Text>
                <Text style={styles.bulletItem}>• Các tài liệu bổ sung nếu được yêu cầu (ví dụ: mã số thuế, sao kê ngân hàng)</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>2.2. Quy trình xét duyệt:</Text> Hồ sơ KYC sẽ được đội ngũ quản trị viên
                xem xét trong vòng tối đa 7 ngày làm việc. Người dùng sẽ nhận được thông báo về
                kết quả qua email hoặc thông báo trên nền tảng.
              </Text>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>2.3. Từ chối xác minh:</Text> MACha có quyền từ chối xác minh danh tính
                nếu phát hiện thông tin không chính xác, giả mạo, hoặc vi phạm các quy định.
                Quyết định này là cuối cùng và không thể khiếu nại.
              </Text>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>2.4. Bảo mật thông tin:</Text> MACha cam kết bảo mật tối đa thông tin cá nhân
                của người dùng theo quy định của pháp luật về bảo vệ dữ liệu cá nhân.
              </Text>
            </View>
          </View>

          {/* Section 3 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. TẠO CHIẾN DỊCH GÂY QUỸ</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>3.1. Điều kiện tạo chiến dịch:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Người dùng phải đã hoàn thành xác minh danh tính (KYC) và có trạng thái "verified"</Text>
                <Text style={styles.bulletItem}>• Người dùng không bị khóa tài khoản hoặc vi phạm điều khoản</Text>
                <Text style={styles.bulletItem}>• Cung cấp đầy đủ thông tin bắt buộc: tiêu đề, mô tả (tối thiểu 50 ký tự), mục tiêu quyên góp, danh mục, ngày bắt đầu và kết thúc, hình ảnh banner</Text>
                <Text style={styles.bulletItem}>• Cung cấp thông tin liên hệ: họ tên, số điện thoại, email, địa chỉ</Text>
                <Text style={styles.bulletItem}>• Xác định các mốc cam kết (milestones) với phần trăm quyên góp và thời gian cam kết</Text>
                <Text style={styles.bulletItem}>• Bổ sung lịch trình dự kiến sử dụng tiền quyên góp (nếu có)</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>3.2. Danh mục chiến dịch:</Text> Chiến dịch phải thuộc một trong các danh mục
                được phép: Trẻ em, Người già, Người nghèo, Thiên tai, Y tế, Giáo dục, Người khuyết tật, Hoàn cảnh khó khăn,
                Động vật, Môi trường, Cộng đồng, hoặc Khác.
              </Text>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>3.3. Nội dung chiến dịch:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Nội dung phải chân thực, không được giả mạo hoặc gây hiểu lầm</Text>
                <Text style={styles.bulletItem}>• Không được chứa nội dung vi phạm pháp luật, đạo đức, thuần phong mỹ tục</Text>
                <Text style={styles.bulletItem}>• Không được quảng cáo sản phẩm, dịch vụ thương mại</Text>
                <Text style={styles.bulletItem}>• Không được sử dụng hình ảnh, nội dung vi phạm bản quyền</Text>
                <Text style={styles.bulletItem}>• Phải cung cấp tài liệu chứng minh (nếu có) để tăng tính minh bạch</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>3.4. Quy trình duyệt chiến dịch:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Chiến dịch sau khi tạo sẽ ở trạng thái "pending" (chờ duyệt)</Text>
                <Text style={styles.bulletItem}>• Đội ngũ quản trị viên sẽ xem xét và quyết định trong vòng tối đa 7 ngày làm việc</Text>
                <Text style={styles.bulletItem}>• Chiến dịch có thể được chấp thuận ("active") hoặc từ chối ("rejected") với lý do cụ thể</Text>
                <Text style={styles.bulletItem}>• Người tạo chiến dịch sẽ nhận thông báo về kết quả duyệt</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>3.5. Trách nhiệm của người tạo chiến dịch:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Chịu trách nhiệm về tính chân thực của thông tin đã cung cấp</Text>
                <Text style={styles.bulletItem}>• Cam kết sử dụng tiền quyên góp đúng mục đích đã công bố</Text>
                <Text style={styles.bulletItem}>• Cung cấp báo cáo và cập nhật tiến độ sử dụng tiền cho người quyên góp</Text>
                <Text style={styles.bulletItem}>• Chịu trách nhiệm pháp lý nếu vi phạm cam kết hoặc sử dụng sai mục đích</Text>
                <Text style={styles.bulletItem}>• Hoàn trả tiền quyên góp nếu chiến dịch bị hủy do vi phạm quy định</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>3.6. Hủy chiến dịch:</Text> Người tạo chiến dịch có thể tự hủy chiến dịch
                của mình bất kỳ lúc nào với lý do rõ ràng. Khi chiến dịch bị hủy, các quy định về
                hoàn tiền sẽ được áp dụng theo Điều 6.
              </Text>
            </View>
          </View>

          {/* Section 4 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. QUYÊN GÓP (DONATE)</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>4.1. Điều kiện quyên góp:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Người quyên góp phải có tài khoản trên nền tảng MACha</Text>
                <Text style={styles.bulletItem}>• Chỉ có thể quyên góp cho các chiến dịch ở trạng thái "active"</Text>
                <Text style={styles.bulletItem}>• Số tiền quyên góp phải lớn hơn 0</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>4.2. Phương thức thanh toán:</Text> MACha hỗ trợ các phương thức thanh toán
                thông qua SePay bao gồm: Thẻ tín dụng/Ghi nợ, Chuyển khoản ngân hàng, và Chuyển khoản qua NAPAS.
              </Text>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>4.3. Xác nhận giao dịch:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Giao dịch quyên góp chỉ được xác nhận khi thanh toán thành công</Text>
                <Text style={styles.bulletItem}>• Số tiền quyên góp sẽ được cập nhật vào tổng số tiền của chiến dịch ngay sau khi thanh toán thành công</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>4.4. Quyền và nghĩa vụ của người quyên góp:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Người quyên góp có quyền bỏ phiếu (vote) cho các yêu cầu rút tiền của chiến dịch mà họ đã quyên góp</Text>
                <Text style={styles.bulletItem}>• Trọng lượng phiếu bầu được tính dựa trên tổng số tiền đã quyên góp cho chiến dịch đó</Text>
                <Text style={styles.bulletItem}>• Người quyên góp không thể yêu cầu hoàn tiền tự ý, trừ các trường hợp được quy định tại Điều 6</Text>
                <Text style={styles.bulletItem}>• Người quyên góp có trách nhiệm đọc kỹ thông tin chiến dịch trước khi quyên góp</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>4.5. Bảo đảm giao dịch:</Text> MACha cam kết đảm bảo tính bảo mật và an toàn
                của mọi giao dịch quyên góp thông qua các công nghệ mã hóa và hệ thống thanh toán được chứng nhận.
              </Text>
            </View>
          </View>

          {/* Section 5 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. RÚT TIỀN VÀ GIẢI NGÂN</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>5.1. Điều kiện rút tiền:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Chỉ người tạo chiến dịch mới có quyền yêu cầu rút tiền</Text>
                <Text style={styles.bulletItem}>• Chiến dịch phải ở trạng thái "active"</Text>
                <Text style={styles.bulletItem}>• Số tiền yêu cầu rút không được vượt quá số tiền có sẵn (available amount)</Text>
                <Text style={styles.bulletItem}>• Không được có yêu cầu rút tiền nào khác đang chờ xử lý</Text>
                <Text style={styles.bulletItem}>• Phải cung cấp lý do rõ ràng cho việc rút tiền (tối thiểu 10 ký tự)</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>5.2. Tính toán số tiền có sẵn:</Text> Số tiền có sẵn được tính bằng công thức:{' '}
                <Text style={styles.italic}>Số tiền có sẵn = Tổng số tiền đã quyên góp - Tổng số tiền đã được giải ngân</Text>
              </Text>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>5.3. Quy trình rút tiền:</Text>
              </Text>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>Giai đoạn 1 - Bỏ phiếu từ người quyên góp:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Yêu cầu rút tiền sẽ được gửi đến tất cả người quyên góp của chiến dịch</Text>
                <Text style={styles.bulletItem}>• Thời gian bỏ phiếu: 3 ngày kể từ khi yêu cầu được tạo</Text>
                <Text style={styles.bulletItem}>• Chỉ những người đã quyên góp (với payment_status = "completed") mới được bỏ phiếu</Text>
                <Text style={styles.bulletItem}>• Trọng lượng phiếu bầu = Tổng số tiền đã quyên góp của người đó</Text>
                <Text style={styles.bulletItem}>• Người quyên góp có thể bỏ phiếu "approve" (đồng ý) hoặc "reject" (từ chối)</Text>
                <Text style={styles.bulletItem}>• Người quyên góp có thể thay đổi phiếu bầu bất kỳ lúc nào trong thời gian bỏ phiếu</Text>
                <Text style={styles.bulletItem}>• Kết quả được tính dựa trên phần trăm trọng lượng: Yêu cầu được chấp thuận nếu có ≥50% trọng lượng đồng ý</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>Giai đoạn 2 - Xét duyệt bởi quản trị viên:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Sau khi kết thúc bỏ phiếu, yêu cầu chuyển sang trạng thái "voting_completed"</Text>
                <Text style={styles.bulletItem}>• Quản trị viên sẽ xem xét yêu cầu và có thể chấp thuận ("admin_approved") hoặc từ chối ("admin_rejected")</Text>
                <Text style={styles.bulletItem}>• Quản trị viên có thể yêu cầu bổ sung thông tin hoặc tài liệu</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>Giai đoạn 3 - Giải ngân:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Sau khi được quản trị viên chấp thuận, yêu cầu chuyển sang trạng thái "admin_approved"</Text>
                <Text style={styles.bulletItem}>• Hệ thống sẽ thực hiện chuyển khoản qua SePay</Text>
                <Text style={styles.bulletItem}>• Sau khi chuyển khoản thành công, yêu cầu chuyển sang trạng thái "released"</Text>
                <Text style={styles.bulletItem}>• Người tạo chiến dịch và tất cả người quyên góp sẽ nhận thông báo về việc giải ngân</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>5.4. Rút tiền tự động theo mốc:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Khi chiến dịch đạt các mốc phần trăm quyên góp đã được đặt ra (milestones), hệ thống có thể tự động tạo yêu cầu rút tiền</Text>
                <Text style={styles.bulletItem}>• Yêu cầu tự động vẫn phải trải qua quy trình bỏ phiếu và xét duyệt như yêu cầu thủ công</Text>
                <Text style={styles.bulletItem}>• Khi chiến dịch hết hạn và đạt 100%, hệ thống tự động tạo yêu cầu rút số tiền còn lại</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>5.5. Từ chối yêu cầu rút tiền:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Yêu cầu có thể bị từ chối nếu: không đạt đủ phần trăm đồng ý từ người quyên góp, không đáp ứng điều kiện xét duyệt, hoặc phát hiện vi phạm</Text>
                <Text style={styles.bulletItem}>• Người tạo chiến dịch sẽ nhận thông báo về lý do từ chối</Text>
                <Text style={styles.bulletItem}>• Người tạo chiến dịch có thể tạo yêu cầu mới sau khi yêu cầu cũ bị từ chối</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>5.6. Trách nhiệm sử dụng tiền:</Text> Người tạo chiến dịch cam kết sử dụng
                tiền đã rút đúng mục đích đã công bố trong chiến dịch và cung cấp báo cáo minh bạch
                về việc sử dụng tiền khi được yêu cầu.
              </Text>
            </View>
          </View>

          {/* Section 6 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. CHÍNH SÁCH HOÀN TIỀN</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>6.1. Nguyên tắc chung:</Text> Việc hoàn tiền chỉ được thực hiện trong các
                trường hợp đặc biệt được quy định trong điều khoản này. Người quyên góp không thể
                yêu cầu hoàn tiền tự ý sau khi đã quyên góp thành công.
              </Text>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>6.2. Trường hợp chiến dịch bị hủy do vi phạm:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Khi chiến dịch bị hủy do vi phạm quy định hoặc bị người dùng khác báo cáo, hệ thống sẽ tự động thực hiện hoàn tiền theo tỷ lệ</Text>
                <Text style={styles.bulletItem}>• Hệ thống sẽ hủy tất cả các yêu cầu rút tiền đang chờ xử lý</Text>
                <Text style={styles.bulletItem}>• Số tiền hoàn lại được tính dựa trên số tiền còn lại trong escrow (chưa được giải ngân)</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>6.3. Hoàn tiền theo tỷ lệ (Proportional Refund):</Text>
              </Text>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>Trường hợp chưa rút tiền lần nào:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Người quyên góp sẽ được hoàn lại 100% số tiền đã quyên góp</Text>
                <Text style={styles.bulletItem}>• Quy trình hoàn tiền được thực hiện tự động trong vòng 7 ngày làm việc</Text>
                <Text style={styles.bulletItem}>• Người quyên góp sẽ nhận thông báo và email xác nhận</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>Trường hợp đã rút tiền một phần:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Tỷ lệ hoàn tiền = (Số tiền còn lại / Tổng số tiền đã quyên góp) × 100%</Text>
                <Text style={styles.bulletItem}>• Người quyên góp sẽ được hoàn lại ngay phần tiền còn lại trong escrow</Text>
                <Text style={styles.bulletItem}>• Phần tiền đã được giải ngân sẽ được thu hồi từ người tạo chiến dịch</Text>
                <Text style={styles.bulletItem}>• Nếu thu hồi thành công, người quyên góp sẽ được hoàn tiếp phần còn lại</Text>
                <Text style={styles.bulletItem}>• MACha không đảm bảo 100% hoàn tiền nếu không thể thu hồi từ người tạo chiến dịch</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>6.4. Quy trình thu hồi tiền từ người tạo chiến dịch:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• MACha sẽ tạo "Recovery Case" để thu hồi số tiền đã được giải ngân</Text>
                <Text style={styles.bulletItem}>• Người tạo chiến dịch sẽ nhận thông báo yêu cầu hoàn trả trong vòng 30 ngày</Text>
                <Text style={styles.bulletItem}>• Nếu người tạo chiến dịch không hoàn trả đúng hạn, MACha sẽ áp dụng các biện pháp pháp lý cần thiết</Text>
                <Text style={styles.bulletItem}>• Tiền thu hồi được sẽ được phân phối lại cho người quyên góp</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>6.5. Phương thức hoàn tiền:</Text> Tiền hoàn lại sẽ được chuyển về tài khoản
                thanh toán ban đầu của người quyên góp thông qua hệ thống SePay trong vòng 7-14 ngày làm việc.
              </Text>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>6.6. Trường hợp không thể hoàn tiền:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Nếu toàn bộ số tiền đã được giải ngân và không thể thu hồi từ người tạo chiến dịch</Text>
                <Text style={styles.bulletItem}>• Người quyên góp sẽ được thông báo về tình trạng và các biện pháp pháp lý đang được thực hiện</Text>
                <Text style={styles.bulletItem}>• MACha sẽ hỗ trợ tối đa trong khả năng của mình nhưng không chịu trách nhiệm bồi thường</Text>
              </View>
            </View>
          </View>

          {/* Section 7 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. BÁO CÁO VÀ XỬ LÝ VI PHẠM</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>7.1. Quyền báo cáo:</Text> Người dùng có quyền báo cáo các chiến dịch, bài viết,
                bình luận, hoặc người dùng khác nếu phát hiện vi phạm quy định.
              </Text>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>7.2. Các lý do báo cáo:</Text> Spam, nội dung không phù hợp, lừa đảo, giả mạo,
                quấy rối, bạo lực, vi phạm bản quyền, thông tin sai lệch, hoặc các vi phạm khác.
              </Text>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>7.3. Quy trình xử lý:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Báo cáo sẽ được đội ngũ quản trị viên xem xét trong vòng 7 ngày làm việc</Text>
                <Text style={styles.bulletItem}>• Tùy mức độ vi phạm, có thể áp dụng: cảnh báo, ẩn nội dung, hủy chiến dịch, khóa tài khoản</Text>
                <Text style={styles.bulletItem}>• Nếu chiến dịch bị hủy, các quy định về hoàn tiền tại Điều 6 sẽ được áp dụng</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>7.4. Khóa tài khoản:</Text> MACha có quyền khóa tài khoản tạm thời hoặc vĩnh viễn
                nếu phát hiện vi phạm nghiêm trọng, gian lận, hoặc vi phạm pháp luật.
              </Text>
            </View>
          </View>

          {/* Section 8 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. QUYỀN VÀ TRÁCH NHIỆM CỦA QUẢN TRỊ VIÊN (ADMIN)</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>8.1. Định nghĩa và bổ nhiệm:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Quản trị viên (Admin) là những người được chủ sở hữu nền tảng (Owner) bổ nhiệm để quản lý và vận hành nền tảng MACha</Text>
                <Text style={styles.bulletItem}>• Chỉ có chủ sở hữu nền tảng mới có quyền tạo, cập nhật, hoặc thu hồi quyền quản trị viên</Text>
                <Text style={styles.bulletItem}>• Tài khoản quản trị viên được tự động xác minh (verified) khi được tạo</Text>
                <Text style={styles.bulletItem}>• Quản trị viên có thể bị thu hồi quyền hoặc bị khóa tài khoản nếu vi phạm quy định</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>8.2. Quyền hạn của quản trị viên:</Text>
              </Text>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>Duyệt xác minh danh tính (KYC):</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Xem danh sách các hồ sơ KYC đang chờ duyệt</Text>
                <Text style={styles.bulletItem}>• Xem chi tiết thông tin và tài liệu KYC của người dùng</Text>
                <Text style={styles.bulletItem}>• Chấp thuận hoặc từ chối hồ sơ KYC với lý do cụ thể</Text>
                <Text style={styles.bulletItem}>• Thời gian xét duyệt tối đa: 7 ngày làm việc kể từ khi nhận hồ sơ</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>Duyệt chiến dịch gây quỹ:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Xem danh sách các chiến dịch đang chờ duyệt (pending)</Text>
                <Text style={styles.bulletItem}>• Xem chi tiết thông tin, nội dung, và tài liệu của chiến dịch</Text>
                <Text style={styles.bulletItem}>• Chấp thuận chiến dịch để chuyển sang trạng thái "active" (hoạt động)</Text>
                <Text style={styles.bulletItem}>• Từ chối chiến dịch với lý do cụ thể, chuyển sang trạng thái "rejected"</Text>
                <Text style={styles.bulletItem}>• Thời gian xét duyệt tối đa: 7 ngày làm việc kể từ khi chiến dịch được tạo</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>Duyệt sự kiện (Events):</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Xem danh sách các sự kiện đang chờ duyệt</Text>
                <Text style={styles.bulletItem}>• Xem chi tiết thông tin và nội dung sự kiện</Text>
                <Text style={styles.bulletItem}>• Chấp thuận hoặc từ chối sự kiện với lý do cụ thể</Text>
                <Text style={styles.bulletItem}>• Thời gian xét duyệt tối đa: 7 ngày làm việc</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>Quản lý người dùng:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Xem danh sách tất cả người dùng trên nền tảng</Text>
                <Text style={styles.bulletItem}>• Xem chi tiết thông tin tài khoản, lịch sử hoạt động của người dùng</Text>
                <Text style={styles.bulletItem}>• Xem lịch sử KYC và các chiến dịch của người dùng</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>Quản lý báo cáo:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Xem danh sách tất cả các báo cáo từ người dùng</Text>
                <Text style={styles.bulletItem}>• Xem chi tiết báo cáo, thông tin người báo cáo và đối tượng bị báo cáo</Text>
                <Text style={styles.bulletItem}>• Cập nhật trạng thái xử lý báo cáo: đang xử lý, đã xử lý, từ chối</Text>
                <Text style={styles.bulletItem}>• Ghi nhận quyết định xử lý và chi tiết giải quyết</Text>
                <Text style={styles.bulletItem}>• Thời gian xử lý báo cáo tối đa: 7 ngày làm việc</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>Duyệt yêu cầu rút tiền:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Xem danh sách các yêu cầu rút tiền đã hoàn thành giai đoạn bỏ phiếu từ người quyên góp</Text>
                <Text style={styles.bulletItem}>• Xem chi tiết yêu cầu rút tiền: số tiền, lý do, kết quả bỏ phiếu, thông tin chiến dịch</Text>
                <Text style={styles.bulletItem}>• Chấp thuận yêu cầu rút tiền để hệ thống thực hiện giải ngân</Text>
                <Text style={styles.bulletItem}>• Từ chối yêu cầu rút tiền với lý do cụ thể nếu phát hiện vi phạm hoặc không đáp ứng điều kiện</Text>
                <Text style={styles.bulletItem}>• Yêu cầu bổ sung thông tin hoặc tài liệu từ người tạo chiến dịch nếu cần</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>Xem thống kê và báo cáo:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Truy cập dashboard để xem tổng quan hoạt động của nền tảng</Text>
                <Text style={styles.bulletItem}>• Xem thống kê về số lượng người dùng, chiến dịch, sự kiện</Text>
                <Text style={styles.bulletItem}>• Xem số lượng các hồ sơ đang chờ duyệt</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>8.3. Trách nhiệm của quản trị viên:</Text>
              </Text>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>Xét duyệt công bằng và minh bạch:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Xem xét kỹ lưỡng tất cả hồ sơ, chiến dịch, sự kiện, và báo cáo một cách công bằng</Text>
                <Text style={styles.bulletItem}>• Không được từ chối hoặc chấp thuận dựa trên cảm tính cá nhân</Text>
                <Text style={styles.bulletItem}>• Phải cung cấp lý do cụ thể và rõ ràng khi từ chối bất kỳ yêu cầu nào</Text>
                <Text style={styles.bulletItem}>• Xử lý trong thời gian quy định (tối đa 7 ngày làm việc)</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>Bảo mật thông tin:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Bảo mật tuyệt đối thông tin cá nhân, tài liệu KYC của người dùng</Text>
                <Text style={styles.bulletItem}>• Không được tiết lộ, chia sẻ, hoặc sử dụng thông tin người dùng cho mục đích khác ngoài công việc quản lý</Text>
                <Text style={styles.bulletItem}>• Tuân thủ các quy định về bảo vệ dữ liệu cá nhân</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>Xử lý báo cáo kịp thời:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Xem xét và xử lý các báo cáo vi phạm một cách nhanh chóng và công bằng</Text>
                <Text style={styles.bulletItem}>• Áp dụng các biện pháp xử lý phù hợp với mức độ vi phạm</Text>
                <Text style={styles.bulletItem}>• Ghi nhận đầy đủ quyết định và lý do xử lý</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>Kiểm soát chất lượng:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Đảm bảo các chiến dịch và sự kiện được duyệt đáp ứng đầy đủ tiêu chuẩn về nội dung, tính chân thực, và tuân thủ quy định</Text>
                <Text style={styles.bulletItem}>• Ngăn chặn các chiến dịch lừa đảo, giả mạo, hoặc vi phạm pháp luật</Text>
                <Text style={styles.bulletItem}>• Bảo vệ quyền lợi của người quyên góp và người tạo chiến dịch</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>Giám sát yêu cầu rút tiền:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Xem xét kỹ lưỡng các yêu cầu rút tiền sau khi đã được người quyên góp bỏ phiếu</Text>
                <Text style={styles.bulletItem}>• Đảm bảo yêu cầu rút tiền hợp lệ, đúng mục đích, và tuân thủ quy định</Text>
                <Text style={styles.bulletItem}>• Yêu cầu bổ sung thông tin hoặc tài liệu nếu cần thiết</Text>
                <Text style={styles.bulletItem}>• Chấp thuận giải ngân chỉ khi đảm bảo tính hợp pháp và minh bạch</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>Tuân thủ quy định:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Tuân thủ nghiêm ngặt các quy định của nền tảng và pháp luật hiện hành</Text>
                <Text style={styles.bulletItem}>• Không được lạm dụng quyền hạn để trục lợi cá nhân</Text>
                <Text style={styles.bulletItem}>• Không được tạo chiến dịch hoặc tham gia các hoạt động có thể gây xung đột lợi ích</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>8.4. Giới hạn quyền hạn:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Quản trị viên không có quyền tạo, cập nhật, hoặc xóa tài khoản quản trị viên khác</Text>
                <Text style={styles.bulletItem}>• Quản trị viên không có quyền thay đổi cài đặt hệ thống cốt lõi hoặc cấu hình thanh toán</Text>
                <Text style={styles.bulletItem}>• Quản trị viên không có quyền truy cập vào thông tin tài chính chi tiết của chủ sở hữu nền tảng</Text>
                <Text style={styles.bulletItem}>• Quản trị viên không thể tự mình khóa hoặc xóa tài khoản của chính mình</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>8.5. Vi phạm và xử lý:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Nếu quản trị viên vi phạm quy định, lạm dụng quyền hạn, hoặc có hành vi không phù hợp, chủ sở hữu nền tảng có quyền:</Text>
                <Text style={styles.bulletItem}>  - Thu hồi quyền quản trị viên (chuyển role về "user")</Text>
                <Text style={styles.bulletItem}>  - Khóa tài khoản tạm thời hoặc vĩnh viễn</Text>
                <Text style={styles.bulletItem}>  - Yêu cầu bồi thường nếu gây thiệt hại</Text>
                <Text style={styles.bulletItem}>  - Áp dụng các biện pháp pháp lý nếu cần thiết</Text>
                <Text style={styles.bulletItem}>• Mọi quyết định của quản trị viên đều được ghi nhận và có thể được xem xét lại bởi chủ sở hữu nền tảng</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>8.6. Bảo mật tài khoản:</Text> Quản trị viên có trách nhiệm bảo mật tài khoản của mình.
                Mọi hoạt động từ tài khoản quản trị viên đều được ghi nhận và chịu trách nhiệm. Nếu phát hiện tài khoản
                bị xâm nhập, quản trị viên phải báo cáo ngay lập tức cho chủ sở hữu nền tảng.
              </Text>
            </View>
          </View>

          {/* Section 9 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. TRÁCH NHIỆM VÀ GIỚI HẠN</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>9.1. Trách nhiệm của MACha:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Duy trì nền tảng hoạt động ổn định và an toàn</Text>
                <Text style={styles.bulletItem}>• Bảo vệ thông tin cá nhân của người dùng</Text>
                <Text style={styles.bulletItem}>• Xét duyệt và kiểm soát các chiến dịch gây quỹ</Text>
                <Text style={styles.bulletItem}>• Hỗ trợ giải quyết tranh chấp trong khả năng của mình</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>9.2. Giới hạn trách nhiệm:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• MACha không chịu trách nhiệm về việc người tạo chiến dịch sử dụng sai mục đích sau khi đã giải ngân</Text>
                <Text style={styles.bulletItem}>• MACha không đảm bảo hoàn tiền 100% nếu không thể thu hồi từ người tạo chiến dịch</Text>
                <Text style={styles.bulletItem}>• MACha không chịu trách nhiệm về các tổn thất gián tiếp, lợi nhuận bị mất, hoặc thiệt hại khác</Text>
                <Text style={styles.bulletItem}>• MACha không đảm bảo tính chính xác tuyệt đối của thông tin do người tạo chiến dịch cung cấp</Text>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>9.3. Trách nhiệm của người dùng:</Text>
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Chịu trách nhiệm về mọi hoạt động diễn ra từ tài khoản của mình</Text>
                <Text style={styles.bulletItem}>• Bảo mật thông tin đăng nhập và không chia sẻ với bên thứ ba</Text>
                <Text style={styles.bulletItem}>• Cung cấp thông tin chính xác, trung thực</Text>
                <Text style={styles.bulletItem}>• Tuân thủ mọi quy định pháp luật hiện hành</Text>
              </View>
            </View>
          </View>

          {/* Section 10 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. BẢO MẬT VÀ BẢO VỆ DỮ LIỆU</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>10.1. Bảo vệ thông tin:</Text> MACha cam kết bảo vệ thông tin cá nhân của người dùng
                theo quy định của pháp luật về bảo vệ dữ liệu cá nhân. Thông tin sẽ được mã hóa và lưu trữ an toàn.
              </Text>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>10.2. Sử dụng thông tin:</Text> MACha chỉ sử dụng thông tin cá nhân cho mục đích
                vận hành nền tảng và không chia sẻ với bên thứ ba mà không có sự đồng ý, trừ các trường hợp
                được yêu cầu bởi pháp luật.
              </Text>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>10.3. Bảo mật giao dịch:</Text> Mọi giao dịch tài chính đều được thực hiện thông qua
                các hệ thống thanh toán được mã hóa và đạt chuẩn bảo mật quốc tế.
              </Text>
            </View>
          </View>

          {/* Section 11 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>11. THAY ĐỔI ĐIỀU KHOẢN</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.paragraph}>
                MACha có quyền thay đổi, bổ sung điều khoản sử dụng bất kỳ lúc nào. Người dùng sẽ được thông báo
                về các thay đổi quan trọng qua email hoặc thông báo trên nền tảng. Việc tiếp tục sử dụng dịch vụ
                sau khi có thay đổi đồng nghĩa với việc người dùng chấp nhận các điều khoản mới.
              </Text>
            </View>
          </View>

          {/* Section 12 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>12. GIẢI QUYẾT TRANH CHẤP</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>12.1. Thương lượng:</Text> Mọi tranh chấp phát sinh sẽ được ưu tiên giải quyết
                thông qua thương lượng, hòa giải giữa các bên liên quan.
              </Text>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>12.2. Trọng tài/Tòa án:</Text> Nếu không thể thương lượng, tranh chấp sẽ được
                giải quyết tại Tòa án có thẩm quyền tại Việt Nam theo quy định của pháp luật.
              </Text>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>12.3. Luật áp dụng:</Text> Điều khoản này được điều chỉnh và giải thích theo
                pháp luật Cộng hòa Xã hội Chủ nghĩa Việt Nam.
              </Text>
            </View>
          </View>

          {/* Section 13 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>13. LIÊN HỆ</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.paragraph}>
                Nếu Quý người dùng có bất kỳ câu hỏi hoặc khiếu nại nào liên quan đến điều khoản sử dụng,
                vui lòng liên hệ với chúng tôi qua:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Email: support@macha.vn</Text>
                <Text style={styles.bulletItem}>• Địa chỉ: [Địa chỉ công ty]</Text>
                <Text style={styles.bulletItem}>• Hotline: [Số điện thoại hỗ trợ]</Text>
              </View>
            </View>
          </View>

          {/* Footer Note */}
          <View style={styles.footerNote}>
            <Text style={styles.footerText}>
              Bằng việc sử dụng nền tảng MACha, Quý người dùng xác nhận rằng đã đọc, hiểu và đồng ý
              với tất cả các điều khoản được nêu trong tài liệu này.
            </Text>
            <Text style={styles.footerSubtext}>
              Chúng tôi cam kết tạo ra một môi trường gây quỹ minh bạch, an toàn và hiệu quả cho cộng đồng.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  updateDate: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#A855F7',
    paddingBottom: 8,
  },
  sectionContent: {
    marginTop: 8,
  },
  introText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#374151',
    marginBottom: 16,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: '#374151',
    marginBottom: 12,
  },
  bold: {
    fontWeight: '600',
    color: '#1F2937',
  },
  italic: {
    fontStyle: 'italic',
  },
  bulletList: {
    marginLeft: 16,
    marginBottom: 12,
  },
  bulletItem: {
    fontSize: 14,
    lineHeight: 22,
    color: '#374151',
    marginBottom: 6,
  },
  footerNote: {
    backgroundColor: '#F3E8FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#A855F7',
  },
  footerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 22,
  },
  footerSubtext: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
  },
});

