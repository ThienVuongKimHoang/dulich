import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { C, globalStyles } from "../constants";
import LogoIcon from "../components/LogoIcon";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// ─── PLACE STORIES ───
const PLACE_STORIES = {
  "chua-thanh-tam": {
    placeName: "Chùa Thanh Tâm",
    audioSrc: "/audio/chua_thanhtam.mp3",
    audioDurSec: 112,
    vi: [
      "Nằm tại ấp 1 (hoặc ấp 3 theo một số tài liệu) xã Lê Minh Xuân cũ, nay thuộc xã Bình Lợi mới, Bát Bửu Phật Đài — hay còn gọi là chùa Thanh Tâm — là một trong những điểm du lịch tâm linh nổi tiếng nhất ngoại ô TP.HCM. Công trình được khởi công năm 1955 bên dòng kênh Cầu Xáng và hoàn thành năm 1956, trên khuôn viên đất rộng khoảng 30 ha do cư sĩ Lê Chí Bình phát tâm cúng dường.",
      "Trong những năm chiến tranh khốc liệt, toàn bộ ngôi chùa bị bom đạn tàn phá và thiêu rụi hoàn toàn. Tuy nhiên, một hiện tượng kỳ lạ đã xảy ra: kim thân Đức Phật Thích Ca — nặng khoảng 4 tấn, cao 3m, đặt trên đài sen cao 3m — vẫn đứng vững nguyên vẹn giữa tro tàn. Hình ảnh tượng Phật đơn độc, kiên cường giữa vùng đồng không mông quạnh ngập tràn cỏ dại sau năm 1976 đã khơi nguồn cho tên gọi dân gian \"Phật Cô Đơn\".",
      "Trải qua nhiều đợt trùng tu toàn diện bởi Ban Trị sự Giáo hội Phật giáo Việt Nam TP.HCM, chùa Thanh Tâm ngày nay có diện mạo khang trang, tráng lệ nhưng vẫn giữ nét cổ kính trang nghiêm. Cổng tam quan chạm khắc uốn lượn tinh xảo, chánh điện thờ Phật A Di Đà kết hợp điện thờ riêng dành cho Quan Âm, Chuẩn Đề và Địa Tạng Vương Bồ Tát. Hiện nay, chùa là cơ sở đào tạo nội trú khép kín cho các ni sinh theo học chương trình cử nhân và sau đại học của Học viện Phật giáo Việt Nam tại TP.HCM.",
      "Ngoài giá trị lịch sử tâm linh sâu sắc, ngôi chùa còn thu hút đông đảo bạn trẻ tìm đến cầu duyên vào các ngày rằm, mùng một và đặc biệt là ngày Lễ Tình nhân 14/2. Chùa mở cửa đón khách chiêm bái từ 05:00 đến 21:00 hàng ngày. Đặc biệt, trong Đại lễ Phật đản Vesak Liên Hợp Quốc năm 2025, chùa Thanh Tâm vinh dự được chọn tôn trí và tổ chức cho hàng vạn tăng ni, Phật tử chiêm bái xá lợi Đức Phật từ ngày 3/5 đến trưa ngày 8/5/2025.",
    ],
    en: [
      "Located in Hamlet 1 (or Hamlet 3 according to some documents) of the former Lê Minh Xuân commune, now within the new Bình Lợi commune, Bát Bửu Phật Đài — also known as Thanh Tâm Pagoda — is one of the most famous spiritual tourism destinations on the outskirts of Ho Chi Minh City. The structure was built in 1955 along the Cầu Xáng canal and completed in 1956 on approximately 30 hectares of land generously donated by lay Buddhist Lê Chí Bình.",
      "During the devastating years of war, the entire pagoda was severely bombed and completely burned to the ground. However, a remarkable miracle occurred: the golden statue of Shakyamuni Buddha — weighing about 4 tons, 3 meters tall, set atop a 3-meter lotus pedestal — remained standing completely intact amid the ruins and ashes. When people returned to rebuild after 1976, the image of the Buddha standing alone and steadfast amid vast weed-covered emptiness inspired the beloved folk name \"The Lonely Buddha.\"",
      "After several comprehensive restorations by the Ho Chi Minh City Buddhist Sangha, Thanh Tâm Pagoda today presents a magnificently grand yet still classical and solemn appearance. The intricately carved triple gate leads to the main hall enshrining Amitabha Buddha, with separate shrines dedicated to Guanyin, Chuẩn Đề and Địa Tạng Bodhisattvas. Today the temple serves as a closed residential training institute for nuns pursuing bachelor's and postgraduate programs at the Vietnam Buddhist Academy in Ho Chi Minh City.",
      "Beyond its deep spiritual and historical value, the pagoda attracts many young people seeking blessings for love on the 1st and 15th of the lunar calendar — especially on Valentine's Day, February 14th. The temple is open for worship daily from 05:00 to 21:00. Notably, during the 2025 United Nations Vesak celebrations, Thanh Tâm Pagoda was honored as the venue for tens of thousands of monks, nuns, and Buddhist followers to venerate the Buddha's relics from May 3rd to noon on May 8th, 2025.",
    ],
  },

  "dap-xe": {
    placeName: "Tuyến Đạp Xe Rừng Tràm",
    audioSrc: "/audio/dap_xe.mp3",
    audioDurSec: 46,
    vi: [
      "Nhằm đáp ứng xu hướng du lịch trải nghiệm xanh, tuyến đạp xe xuyên rừng tràm Lê Minh Xuân đang trở thành hành trình dã ngoại hấp dẫn đối với các nhóm du khách yêu thích vận động.",
      "Nằm cách trung tâm thành phố khoảng 30 km, khu rừng tràm ngập nước này mang lại bầu không khí trong lành, mát mẻ cùng những con đường mòn đất đỏ rợp bóng cây xanh. Du khách có thể đăng ký các tour đạp xe nửa ngày hoặc một ngày do các đơn vị như Cào Cào Adventures tổ chức.",
      "Hành trình đạp xe thường bắt đầu từ các trục đường giao thông lớn hướng vào đường mòn xuyên rừng, kết thúc tại Tỉnh lộ 10.",
      "Bên cạnh hoạt động đạp xe rèn luyện thể lực dưới tán tràm mát rượi, du khách còn được trải nghiệm cuộc sống dân dã như chèo xuồng ba lá len lỏi qua các con kênh xanh, tự tay hái đọt rau choại rừng.",
      "Du khách cũng có thể tham gia các hoạt động chăm sóc sức khỏe như ngâm chân bằng thảo dược địa phương và massage phục hồi cơ khớp sau chặng đường dài.",
    ],
    en: [
      "Meeting the growing demand for green experiential tourism, the cycling trail through Lê Minh Xuân cajuput forest is becoming an exciting outdoor adventure for active traveler groups.",
      "Located about 30 km from the city center, this flooded cajuput forest offers fresh, cool air and red dirt trails shaded by lush green canopies. Visitors can register for half-day or full-day cycling tours organized by operators like Cào Cào Adventures.",
      "The cycling journey typically starts from major road intersections and enters the forest trail, finishing at Provincial Road 10.",
      "Beyond cycling under the cool cajuput canopy, visitors also experience rural life: paddling a traditional three-plank sampan through green canals and hand-picking wild rau choại shoots.",
      "Health and wellness activities are also available — soaking feet in local herbal water and receiving muscle recovery massages after the long trail.",
    ],
  },

  "sake-quan": {
    placeName: "Sake Quán",
    audioSrc: "/audio/sake_quan.mp3",
    audioDurSec: 27,
    vi: [
      "Sake Quán nằm ngay trên trục đường Trần Văn Giàu, hướng vào xã Bình Lợi mới, ngay chân Cầu Đôi. Không gian sân vườn rộng rãi, thoáng mát, lý tưởng cho các nhóm gia đình hoặc đoàn dã ngoại cuối tuần.",
      "Thực đơn phong phú với các món dân dã đặc trưng miền Tây sông nước: cá tai tượng chiên xù, gỏi củ hủ dừa tôm thịt, lẩu cá diêu hồng, dồi trường chiên giòn.",
      "Giá cả bình dân, phục vụ chu đáo — đây là điểm dừng chân lý tưởng sau hành trình khám phá khu vực Bình Lợi.",
    ],
    en: [
      "Sake Quán sits right on Trần Văn Giàu road heading into Bình Lợi commune, at the foot of Cầu Đôi bridge. The spacious garden setting is ideal for family groups or weekend picnic outings.",
      "The menu is rich with authentic Southern Vietnamese river dishes: crispy elephant ear fish, coconut heart salad with shrimp and pork, tilapia hot pot, and crispy grilled intestines.",
      "With affordable prices and attentive service, it is an ideal dining stop after exploring the Bình Lợi area.",
    ],
  },

  "xuan-huong": {
    placeName: "Khu ẩm thực sinh thái Xuân Hương",
    audioSrc: "/audio/xuan_huong.mp3",
    audioDurSec: 22,
    vi: [
      "Khu ẩm thực sinh thái câu cá giải trí Xuân Hương mang đậm chất làng quê Nam Bộ với hàng dừa nước, cầu khỉ đong đưa và không gian kết hợp hoạt động câu cá giải trí.",
      "Nơi đây nổi tiếng với các món ăn dân gian đặc sắc: gà xé lên mâm, gà hấp mắm nhĩ trong lu, lẩu cá măng chua, heo tộc lên mẹt.",
      "Kết hợp ẩm thực và trải nghiệm câu cá, đây là điểm đến hoàn hảo cho những ai muốn tìm lại hương vị đồng quê Nam Bộ bình dị và thư thái.",
    ],
    en: [
      "Xuân Hương eco-dining and recreational fishing area exudes authentic Southern Vietnamese countryside charm — coconut palm rows, swaying monkey bridges, and fishing activities.",
      "The venue is famous for its folk cuisine: hand-shredded chicken platter, chicken steamed in fish sauce in clay pots, sour bamboo shoot fish hot pot, and pork-in-pot.",
      "Combining dining with fishing experiences, it is a perfect destination for those seeking the simple, peaceful flavors of rural Southern Vietnam.",
    ],
  },

  "tan-phong-koi": {
    placeName: "Tấn Phong Koi Farm",
    audioSrc: "/audio/tan-phong-koi.mp3",
    audioDurSec: 25,
    vi: [
      "Trang trại cá Koi Nguyễn Tấn Phong là trang trại tiên phong và lớn nhất vùng với quy mô ao đất lên đến hơn 9 ha tại ấp 1, xã Bình Lợi.",
      "Du khách được tận mắt chứng kiến những ao nuôi cá Koi thuần Việt khổng lồ, tự tay rải thức ăn cho đàn cá hàng vạn con háu ăn nhô lên mặt nước tạo nên mảng màu sắc rực rỡ.",
      "Du khách cũng có thể tự tay lựa chọn những chú cá Koi đẹp nhất để mua trực tiếp mang về làm cảnh. Đây là mô hình nông nghiệp đô thị công nghệ cao vô cùng thành công.",
    ],
    en: [
      "Nguyễn Tấn Phong Koi Farm is the pioneering and largest farm in the area, with over 9 hectares of earthen ponds in Hamlet 1, Bình Lợi commune.",
      "Visitors witness enormous ponds of Vietnamese-bred Koi up close, hand-feed tens of thousands of eager fish that surge to the surface in a dazzling display of color.",
      "Guests can personally select the most beautiful Koi to purchase directly and bring home. This is an outstandingly successful high-tech urban agriculture model.",
    ],
  },

  "ba-quyen": {
    placeName: "Trại cá cảnh Ba Quyền",
    audioSrc: "/audio/ba-quyen.mp3",
    audioDurSec: 15,
    vi: [
      "Trại cá cảnh Ba Quyền là địa điểm tham quan ao cá Koi và các loại cá cảnh khác như cá ba đuôi, quy mô nhỏ hơn nhưng đa dạng chủng loại.",
      "Tọa lạc tại ấp 1, xã Bình Lợi — cùng khu vực với Tấn Phong Koi Farm, rất thuận tiện để kết hợp tham quan trong một chuyến đi.",
    ],
    en: [
      "Ba Quyền ornamental fish farm is a Koi pond and ornamental fish viewing destination, smaller in scale but featuring diverse species including fancy-tail fish.",
      "Located in Hamlet 1, Bình Lợi — the same area as Tấn Phong Koi Farm — making it very convenient to combine both into a single trip.",
    ],
  },

  "dua-luoi-hong-van": {
    placeName: "Vườn Dưa Lưới Huỳnh Thị Hồng Vân",
    audioSrc: "/audio/dua-luoi-hong-van.mp3",
    audioDurSec: 27,
    vi: [
      "Hợp tác xã dưa lưới công nghệ cao Huỳnh Thị Hồng Vân khởi đầu từ những nhà màng thử nghiệm, nay phát triển thành hệ thống nhà màng quy mô lớn tại khu vực Lê Minh Xuân và Bình Lợi.",
      "Du khách tham quan sẽ được mặc đồ bảo hộ, vào bên trong nhà màng, nghe giới thiệu công nghệ tưới nhỏ giọt thủy canh hiện đại. Điểm độc đáo là mỗi cây dưa chỉ giữ lại một quả duy nhất.",
      "Tự tay hái những quả dưa lưới tròn trịa, căng mọng và bổ ra thưởng thức vị ngọt thanh mát ngay tại vườn là trải nghiệm không thể quên.",
    ],
    en: [
      "Huỳnh Thị Hồng Vân's high-tech netted melon cooperative started from experimental greenhouses and has grown into a large-scale system in Lê Minh Xuân and Bình Lợi.",
      "Tour participants wear light protective gear, enter the greenhouse, and learn about modern drip hydroponic irrigation. Each melon plant is allowed to keep only one fruit for maximum quality.",
      "Hand-picking plump, firm netted melons and tasting their refreshingly sweet flavor right in the garden is an unforgettable experience.",
    ],
  },

  "vuon-lan-son-ha": {
    placeName: "Vườn Lan Sơn Hà",
    audioSrc: "/audio/vuon-lan-son-ha.mp3",
    audioDurSec: 22,
    vi: [
      "Vườn lan Sơn Hà (chủ vườn: Trần Thị Ngọc Thảo) là một trong những trang trại hoa lan quy mô lớn nhất Bình Chánh với diện tích 12.000 m², chuyên trồng và thuần hóa lan Dendrobium từ Thái Lan.",
      "Hơn 40 sắc màu Dendrobium rực rỡ xếp hàng tăm tắp trong vườn tạo nên khung cảnh choáng ngợp. Du khách được chia sẻ kinh nghiệm chọn giống, bón phân và kích hoa ra đều quanh năm.",
    ],
    en: [
      "Sơn Hà Orchid Garden (owner: Trần Thị Ngọc Thảo) is one of Bình Chánh's largest orchid farms at 12,000 m², specializing in growing and domesticating Dendrobium orchids imported from Thailand.",
      "Over 40 vibrant Dendrobium color varieties stand in orderly rows, creating an overwhelming spectacle. Visitors receive tips on variety selection, fertilizing, and stimulating year-round blooming.",
    ],
  },

  "me-lan": {
    placeName: "Vườn Mê Lan",
    audioSrc: "/audio/me-lan.mp3",
    audioDurSec: 21,
    vi: [
      "Vườn Mê Lan nằm dọc theo bờ kênh Rạch Cầu Suối, xã Vĩnh Lộc A, chuyên sưu tầm và trồng dòng lan rừng quý hiếm Ngọc Điểm (lan Ngọc) — loài lan nổi tiếng với hương thơm ngát đặc trưng.",
      "Nhà vườn sở hữu những giò lan Ngọc Điểm có thế đứng đẹp, bộ rễ cực ấn tượng và tỏa hương dịu dàng. Không gian bên bờ kênh xanh mát tạo nên bối cảnh thơ mộng để chiêm ngưỡng hoa lan.",
    ],
    en: [
      "Mê Lan Garden stretches along Rạch Cầu Suối canal in Vĩnh Lộc A commune, specializing in collecting and growing the rare Ngọc Điểm (Jade Point) wild orchid — a species famous for its distinctive fragrance.",
      "The garden boasts Ngọc Điểm orchids with beautiful postures, impressively developed roots, and a gentle, lingering scent. The lush canal-side setting creates a poetic backdrop for admiring these rare orchids.",
    ],
  },

  "lang-nhang": {
    placeName: "Làng Nhang Lê Minh Xuân",
    audioSrc: "/audio/nghe_nhang.mp3",
    audioDurSec: 112,
    vi: [
      "Nằm trên địa bàn xã Lê Minh Xuân cũ (nay thuộc xã Bình Lợi mới), làng nghề se nhang có tuổi đời gần 100 năm là một trong những biểu tượng văn hóa thủ công lâu đời nhất của Thành phố Hồ Chí Minh và là cơ sở sản xuất nhang lớn nhất khu vực Nam Bộ.",
      "Nguồn gốc của làng nghề gắn liền với làn sóng di cư của cộng đồng người Hoa trước năm 1975, phân bố chủ yếu ở khu vực Quận 5 và Quận 6 với các hãng nhang danh tiếng thời bấy giờ như Lưu Hiệp Thành, AAA, Trương Kim Thành.",
      "Từ sau năm 1980, quá trình đô thị hóa nhanh chóng khiến không gian phơi nhang bị thu hẹp, buộc những người thợ làm nhang phải di chuyển ra vùng ven như Lê Minh Xuân để tìm kiếm mặt bằng rộng rãi đón nắng.",
      "Phần bột nhang chủ yếu được làm từ mùn cưa mịn của thân cây bầu dó hoặc cây lồng mứt, phối trộn cùng chất keo kết dính tự nhiên khai thác từ vỏ cây bời lời. Tùy thuộc vào công thức gia truyền, bột nhang được nhào trộn thêm các hương liệu thảo mộc như quế, trầm hương, bách tùng.",
      "Trong khoảng hai thập kỷ qua, làng nghề chứng kiến sự chuyển đổi mạnh mẽ từ se nhang thủ công (7–10 thiên nhang/người/ngày) sang máy se nhang tự động (40–50 thiên nhang/người/ngày, tương đương 40.000–50.000 cây nhang).",
      "Làng nghề se nhang Lê Minh Xuân hiện quy tụ khoảng 124 thành viên, đem lại mức thu nhập bình quân khoảng 7,5 triệu đồng/người/tháng. Điểm nhấn thu hút du khách chính là những sào nhang rực rỡ sắc đỏ, hồng, vàng phơi dọc đường Mai Bá Hương dưới ánh nắng rực rỡ.",
      "Cơ sở sản xuất nhang Minh Phước của chị Nguyễn Cát Bụi Thúy là một trong những xưởng quy mô lớn nhất, duy trì hơn 20 nhân công và đi đầu trong việc đầu tư hệ thống máy sấy nhang hiện đại. Sở Du lịch TP.HCM đã chính thức công nhận làng nhang Lê Minh Xuân là một trong 10 điểm check-in thú vị nhất thành phố.",
    ],
    en: [
      "Located in the former Lê Minh Xuân commune (now part of Bình Lợi), this nearly 100-year-old incense-making village is one of Ho Chi Minh City's oldest craft heritage sites and the largest incense production hub in Southern Vietnam.",
      "The village's origins are tied to the migration wave of ethnic Chinese communities before 1975, concentrated mainly in Districts 5 and 6 where renowned brands like Lưu Hiệp Thành, AAA, and Trương Kim Thành once flourished.",
      "After 1980, rapid urbanization shrank drying space in the city center, forcing craftspeople to relocate to suburban areas like Lê Minh Xuân where they could find wide-open sunlit grounds for drying incense sticks.",
      "Incense powder is crafted from fine sawdust of bầu dó or lồng mứt trees, mixed with natural binder resin extracted from bời lời tree bark. Each family's secret recipe adds herbal fragrances like cinnamon, agarwood, and cypress for a distinctive scent.",
      "Over the past two decades, the village has embraced mechanization — transitioning from hand-rolling (7–10 thousand sticks per person per day) to automated machines producing 40,000–50,000 sticks per person per day, with far more uniform results.",
      "The village now unites around 124 members in cooperatives and local enterprises, earning an average monthly income of 7.5 million VND per person. The most iconic sight is the vivid rows of red, pink, and golden incense drying along both sides of Mai Bá Hương road.",
      "The Minh Phước incense workshop, led by Ms. Nguyễn Cát Bụi Thúy, is among the largest local facilities — operating 20+ workers and pioneering modern drying systems for rainy-season production. The Ho Chi Minh City Department of Tourism has officially recognized this village as one of the city's top 10 most interesting check-in destinations.",
    ],
  },
};

// ─── CYCLING ROUTE ───
const CYCLING_ROUTE = [
  [10.7782, 106.5062],
  [10.7758, 106.5047],
  [10.7732, 106.5033],
  [10.7705, 106.5019],
  [10.7678, 106.5012],
  [10.7650, 106.5025],
  [10.7622, 106.5045],
  [10.7595, 106.5066],
  [10.7568, 106.5090],
  [10.7542, 106.5116],
  [10.7518, 106.5144],
  [10.7500, 106.5170],
];

// ─── MAP DATA ───
const MAP_PLACES = [
  {
    id: "dap-xe",
    name: "Tuyến Đạp Xe Rừng Tràm",
    sub: "Lê Minh Xuân Green Trail",
    pos: [10.7650, 106.5025],
    icon: "🚴",
    imgIcon: "/img/map/dap_xe.png",
    color: "#2E7D32",
    zoom: 14,
    address: "Rừng tràm Lê Minh Xuân → Tỉnh lộ 10, Bình Chánh, TP.HCM",
    desc: "Tuyến đạp xe xuyên rừng tràm ngập nước Lê Minh Xuân — hành trình dã ngoại xanh cách trung tâm 30 km, qua đường mòn đất đỏ rợp bóng tràm, chèo xuồng ba lá và trải nghiệm văn hóa dân dã Nam Bộ.",
    highlights: ["Đường mòn xuyên rừng tràm", "Tour nửa ngày & cả ngày", "Chèo xuồng ba lá", "Massage thảo dược"],
    gmaps: "https://maps.google.com/?q=10.7650,106.5025",
    hours: "06:00 – 18:00",
    best: "Sáng sớm (06:00 – 09:00)",
  },
  {
    id: "lang-mai",
    name: "Làng Mai Bình Lợi",
    sub: null,
    pos: [10.7830, 106.5128],
    icon: "🌸",
    imgIcon: "/img/main_page/hoa_mai.png",
    color: "#C8963E",
    zoom: 16,
    address: "Mai Bá Hương, Ấp 9, Xã Bình Lợi, Bình Chánh, TP.HCM",
    desc: "Vùng đất nổi tiếng với nghề trồng mai vàng truyền thống lâu đời. Hàng trăm vườn mai nở rộ mỗi dịp Tết, tạo nên khung cảnh vàng rực rỡ hiếm thấy giữa ngoại ô Sài Gòn.",
    highlights: ["Vườn mai vàng truyền thống", "Tham quan miễn phí", "Mua mai dịp Tết", "Chụp ảnh check-in"],
    gmaps: "https://maps.app.goo.gl/LvenqzMBQepredYw9",
    hours: "Cả ngày",
    best: "Tháng 11 – tháng 1 (trước Tết)",
  },
  {
    id: "chua-thanh-tam",
    name: "Chùa Thanh Tâm",
    sub: "Phật Cô Đơn",
    pos: [10.779889, 106.514111],
    icon: "🛕",
    imgIcon: "/img/main_page/chua.png",
    color: "#3D5A3E",
    zoom: 17,
    address: "Bát Bửu Phật Đài, Ấp 1, Xã Bình Lợi, Bình Chánh, TP.HCM",
    desc: "Ngôi chùa nổi tiếng với tên gọi thân thương 'Phật Cô Đơn' — tượng Phật đứng giữa không gian thanh tịnh bao quanh bởi thiên nhiên xanh mướt, trở thành điểm tâm linh và check-in độc đáo bậc nhất vùng Bình Lợi.",
    highlights: ["Tượng Phật Cô Đơn độc đáo", "Không gian tâm linh", "Kiến trúc Bát Bửu", "Bình yên, thanh tịnh"],
    gmaps: "https://maps.google.com/?q=10.779889,106.514111",
    hours: "05:00 – 21:00",
    best: "Sáng sớm hoặc chiều tà",
  },
  {
    id: "lang-nhang",
    name: "Làng Nhang Lê Minh Xuân",
    sub: "Nghề trăm năm",
    pos: [10.7855, 106.5108],
    icon: "🕯️",
    imgIcon: "/img/main_page/nhang.jpeg",
    color: "#9B3A1A",
    zoom: 17,
    address: "Đường Mai Bá Hương, Ấp 9, Xã Bình Lợi, Bình Chánh, TP.HCM",
    desc: "Làng nghề se nhang gần 100 năm tuổi — cơ sở sản xuất nhang lớn nhất Nam Bộ. Những sào nhang đỏ, hồng, vàng rực rỡ phơi dọc đường Mai Bá Hương là điểm check-in được Sở Du lịch TP.HCM công nhận.",
    highlights: ["Nghề thủ công trăm năm", "Sào nhang rực rỡ sắc màu", "Top 10 check-in TP.HCM", "Trải nghiệm làm nhang"],
    gmaps: "https://maps.google.com/?q=10.7855,106.5108",
    hours: "06:00 – 17:00",
    best: "Sáng sớm (ánh nắng đẹp)",
  },

  // ─── ẨM THỰC DÂN GIAN ───
  {
    id: "sake-quan",
    name: "Sake Quán",
    sub: "Ẩm thực sân vườn Cầu Đôi",
    pos: [10.7756, 106.5087],
    icon: "🍽️",
    imgIcon: null,
    color: "#C0392B",
    zoom: 17,
    address: "D8/67/1 Trần Văn Giàu, xã Bình Lợi, Bình Chánh, TP.HCM",
    desc: "Quán ăn sân vườn rộng rãi thoáng mát ngay chân Cầu Đôi — thực đơn dân dã miền Tây như cá tai tượng chiên xù, gỏi củ hủ dừa, lẩu cá diêu hồng. Giá bình dân, lý tưởng cho gia đình và đoàn dã ngoại cuối tuần.",
    highlights: ["Cá tai tượng chiên xù", "Lẩu cá diêu hồng", "Sân vườn thoáng mát", "Giá bình dân"],
    gmaps: "https://maps.google.com/?q=10.7756,106.5087",
    hours: "10:00 – 22:00",
    best: "Bữa trưa & tối cuối tuần",
  },
  {
    id: "xuan-huong",
    name: "Khu ẩm thực sinh thái Xuân Hương",
    sub: "Câu cá giải trí miệt vườn",
    pos: [10.7575, 106.5225],
    icon: "🎣",
    imgIcon: null,
    color: "#1565C0",
    zoom: 16,
    address: "C12/40 Long Vĩnh, Ấp 5, xã Bình Hưng, Bình Chánh, TP.HCM",
    desc: "Không gian đậm chất làng quê Nam Bộ với hàng dừa nước, cầu khỉ đong đưa và câu cá giải trí. Nổi tiếng với gà hấp mắm nhĩ trong lu, lẩu cá măng chua, heo tộc lên mẹt.",
    highlights: ["Câu cá giải trí", "Gà hấp mắm nhĩ trong lu", "Cầu khỉ dừa nước", "Ẩm thực đồng quê"],
    gmaps: "https://maps.google.com/?q=10.7575,106.5225",
    hours: "08:00 – 21:00",
    best: "Cuối tuần, sáng đến chiều",
  },

  // ─── DU LỊCH AO CÁ KOI ───
  {
    id: "tan-phong-koi",
    name: "Tấn Phong Koi Farm",
    sub: "Làng cá cảnh công nghệ cao",
    pos: [10.7808, 106.5162],
    icon: "🎏",
    imgIcon: "/img/main_page/koi.jpg",
    color: "#0277BD",
    zoom: 17,
    address: "A3/69, Ấp 1, xã Bình Lợi, Bình Chánh, TP.HCM",
    desc: "Trang trại cá Koi lớn nhất vùng với hơn 9 ha ao nuôi. Du khách tự tay cho cá ăn, ngắm hàng vạn con Koi rực rỡ nổi lên mặt nước, và chọn mua cá giống trực tiếp tại trại.",
    highlights: ["Ao nuôi Koi 9 ha", "Trải nghiệm cho cá ăn", "Mua cá Koi giống", "Mô hình nông nghiệp CNC"],
    gmaps: "https://maps.google.com/?q=10.7808,106.5162",
    hours: "07:00 – 17:00",
    best: "Sáng (cá hoạt động nhiều)",
  },
  {
    id: "ba-quyen",
    name: "Trại cá cảnh Ba Quyền",
    sub: null,
    pos: [10.7800, 106.5148],
    icon: "🐟",
    imgIcon: null,
    color: "#00838F",
    zoom: 17,
    address: "Ấp 1, xã Bình Lợi, Bình Chánh, TP.HCM",
    desc: "Điểm tham quan cá Koi và cá cảnh đa dạng (cá ba đuôi, cá vàng...) quy mô nhỏ hơn, nằm cùng khu ấp 1 — tiện kết hợp tham quan cùng Tấn Phong Koi Farm trong một chuyến.",
    highlights: ["Cá Koi & cá ba đuôi", "Quy mô thân thiện", "Gần Tấn Phong Koi", "Mua cá cảnh"],
    gmaps: "https://maps.google.com/?q=10.7800,106.5148",
    hours: "07:00 – 17:00",
    best: "Buổi sáng",
  },

  // ─── DU LỊCH VƯỜN DƯA ───
  {
    id: "dua-luoi-hong-van",
    name: "Vườn Dưa Lưới Huỳnh Thị Hồng Vân",
    sub: "Nông nghiệp xanh nhà màng",
    pos: [10.7908, 106.5082],
    icon: "🍈",
    imgIcon: null,
    color: "#2E7D32",
    zoom: 16,
    address: "Ấp 2, xã Lê Minh Xuân (xã Bình Lợi mới), Bình Chánh, TP.HCM",
    desc: "Trải nghiệm làm nông dân công nghệ cao trong nhà màng vô trùng — tìm hiểu tưới nhỏ giọt thủy canh, tự tay hái dưa lưới căng mọng và thưởng thức vị ngọt thanh mát ngay tại vườn.",
    highlights: ["Nhà màng công nghệ cao", "Tưới nhỏ giọt thủy canh", "Tự tay hái dưa", "Ăn dưa tươi tại vườn"],
    gmaps: "https://maps.google.com/?q=10.7908,106.5082",
    hours: "07:00 – 17:00",
    best: "Sáng sớm (mát mẻ)",
  },

  // ─── DU LỊCH VƯỜN LAN NGỌC ───
  {
    id: "vuon-lan-son-ha",
    name: "Vườn Lan Sơn Hà",
    sub: "Lan Dendrobium 40+ sắc màu",
    pos: [10.7682, 106.5315],
    icon: "🌺",
    imgIcon: null,
    color: "#AD1457",
    zoom: 16,
    address: "Ấp 5, xã Đa Phước, Bình Chánh, TP.HCM",
    desc: "Trang trại hoa lan lớn nhất Bình Chánh, 12.000 m², chuyên thuần hóa lan Dendrobium Thái Lan với hơn 40 sắc màu rực rỡ. Tham quan, học chăm sóc lan và mua giống chất lượng.",
    highlights: ["12.000 m² lan Dendrobium", "40+ sắc màu", "Học chăm sóc lan", "Mua giống chất lượng"],
    gmaps: "https://maps.google.com/?q=10.7682,106.5315",
    hours: "07:00 – 17:00",
    best: "Sáng sớm (hoa tươi nhất)",
  },
  {
    id: "me-lan",
    name: "Vườn Mê Lan",
    sub: "Lan Ngọc Điểm quý hiếm",
    pos: [10.7938, 106.5198],
    icon: "🌸",
    imgIcon: null,
    color: "#6A1B9A",
    zoom: 17,
    address: "Tổ 9, Ấp 6B, Rạch Cầu Suối, xã Vĩnh Lộc A, Bình Chánh, TP.HCM",
    desc: "Vườn lan bên bờ kênh Rạch Cầu Suối, chuyên sưu tầm lan rừng quý Ngọc Điểm (lan Ngọc) nổi tiếng với hương thơm ngát và bộ rễ đẹp. Không gian kênh rạch thơ mộng, yên bình.",
    highlights: ["Lan Ngọc Điểm quý hiếm", "Bờ kênh thơ mộng", "Hương lan ngát", "Sưu tầm lan rừng"],
    gmaps: "https://maps.google.com/?q=10.7938,106.5198",
    hours: "07:00 – 17:00",
    best: "Sáng & chiều mát",
  },
];

// ─── MAP HELPERS ───
function FlyController({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target.pos, target.zoom, { animate: true, duration: 1.2 });
  }, [target, map]);
  return null;
}

// Theo dõi toạ độ pixel của một marker bất kỳ theo lat/lng
function MarkerPixelTracker({ pos, onPositionChange }) {
  const map = useMap();
  useEffect(() => {
    const update = () => {
      const pt = map.latLngToContainerPoint(pos);
      onPositionChange({ x: pt.x, y: pt.y });
    };
    update();
    map.on('move zoom resize viewreset', update);
    return () => map.off('move zoom resize viewreset', update);
  }, [map, pos, onPositionChange]);
  return null;
}

function makePlaceIcon(place, selected) {
  const s = selected ? 52 : 44;
  const inner = place.imgIcon
    ? `<img src="${place.imgIcon}" style="width:${s}px;height:${s}px;object-fit:contain;filter:drop-shadow(0 ${selected ? 8 : 4}px ${selected ? 24 : 14}px rgba(0,0,0,${selected ? 0.5 : 0.35}));cursor:pointer" />`
    : `<div style="width:${s}px;height:${s}px;border-radius:50%;background:${place.color};border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:${selected ? 22 : 18}px;box-shadow:0 ${selected ? 8 : 4}px ${selected ? 24 : 14}px rgba(0,0,0,${selected ? 0.42 : 0.3});cursor:pointer;transition:all 0.3s">${place.icon}</div>`;
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${s}px;height:${s}px">
      ${selected ? `
        <div style="position:absolute;inset:-8px;border-radius:50%;border:2.5px solid ${place.color};opacity:0.55;animation:ripple 1.8s ease-out infinite"></div>
        <div style="position:absolute;inset:-16px;border-radius:50%;border:2px solid ${place.color};opacity:0.22;animation:ripple 1.8s ease-out infinite 0.5s"></div>
      ` : ""}
      ${inner}
    </div>`,
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
    popupAnchor: [0, -(s / 2 + 6)],
  });
}

const MemoizedMarkers = memo(function MemoizedMarkers({ places, selectedId, onSelect }) {
  return (
    <>
      {places.map(place => (
        <Marker
          key={place.id}
          position={place.pos}
          icon={makePlaceIcon(place, selectedId === place.id)}
          eventHandlers={{ click: () => onSelect(place) }}
        >
          <Popup>
            <div style={{ fontFamily: "'Be Vietnam Pro', sans-serif", minWidth: 170 }}>
              <strong style={{ fontSize: "0.88rem", color: C.dark, display: "block", marginBottom: 3 }}>{place.name}</strong>
              {place.sub && <em style={{ fontSize: "0.75rem", color: C.gold, display: "block", marginBottom: 4 }}>{place.sub}</em>}
              <span style={{ fontSize: "0.72rem", color: "#888" }}>{place.address}</span>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
});

// ─── GENERIC PLACE NARRATOR ───
const NARRATOR_STYLES = `
  @keyframes charAppear {
    from { opacity: 0; transform: translateY(20px) scale(0.7); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes narratorSlideIn {
    from { opacity: 0; transform: translateX(-50%) translateY(20px) scale(0.95); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
  }
  @keyframes dotPulse {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40%           { transform: scale(1.0); opacity: 1; }
  }
  @keyframes textFadeIn {
    from { opacity: 0; transform: translateY(3px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

function PlaceNarrator({ onClose, markerPos, storyData }) {
  const { placeName, audioSrc, audioDurSec, vi: viText, en: enText } = storyData;

  const [lang, setLang] = useState("vi");
  const [seg, setSeg] = useState(0);
  // "stopped" | "playing" | "paused"
  const [status, setStatus] = useState("stopped");
  const [showChat, setShowChat] = useState(false);
  const [frame, setFrame] = useState('khong_noi');
  const audioRef = useRef(null);
  const enChainRef = useRef(false); // kiểm soát chuỗi auto-play EN

  // Chia văn bản thành slides tối đa 10 từ
  const slides = useMemo(() => {
    const paragraphs = lang === "vi" ? viText : enText;
    const full = paragraphs.join(' ');
    const words = full.trim().split(/\s+/);
    const result = [];
    for (let i = 0; i < words.length; i += 10) {
      result.push(words.slice(i, i + 10).join(' '));
    }
    return result;
  }, [lang, viText, enText]);

  // Tự tính timestamp tỉ lệ cho từng slide (VI audio)
  // Đếm ký tự chữ cái thực, bỏ dấu câu & ký tự đặc biệt
  const countLetters = (text) => (text.match(/[\p{L}\p{N}]/gu) || []).length;

  const audioTimestamps = useMemo(() => {
    if (lang !== 'vi') return [];
    const totalLetters = slides.reduce((s, sl) => s + countLetters(sl), 0);
    const ts = [0];
    let elapsed = 0;
    for (let i = 0; i < slides.length - 1; i++) {
      elapsed += (countLetters(slides[i]) / totalLetters) * audioDurSec;
      ts.push(elapsed);
    }
    return ts;
  }, [slides, lang, audioDurSec]); // eslint-disable-line react-hooks/exhaustive-deps

  // Nhân vật xuất hiện → 2.2s sau hiện chat
  useEffect(() => {
    const t = setTimeout(() => setShowChat(true), 2200);
    return () => clearTimeout(t);
  }, []);

  // Frame talking: chỉ animate khi status === "playing"
  useEffect(() => {
    if (status !== "playing") { setFrame('khong_noi'); return; }
    const FRAMES = ['khong_noi', '1', 'noi'];
    let idx = 0;
    const id = setInterval(() => { idx = (idx + 1) % FRAMES.length; setFrame(FRAMES[idx]); }, 220);
    return () => clearInterval(id);
  }, [status]);

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current || audioTimestamps.length === 0) return;
    const t = audioRef.current.currentTime;
    let next = 0;
    for (let i = audioTimestamps.length - 1; i >= 0; i--) {
      if (t >= audioTimestamps[i]) { next = i; break; }
    }
    setSeg(prev => prev !== next ? next : prev);
  }, [audioTimestamps]);

  // Đọc TTS từ segIdx (EN hoặc VI khi không có audio file)
  const speakSegEN = useCallback((segIdx, ttsLang) => {
    if (!window.speechSynthesis || segIdx >= slides.length) {
      enChainRef.current = false;
      setStatus("stopped");
      return;
    }
    setSeg(segIdx);
    const utt = new SpeechSynthesisUtterance(slides[segIdx]);
    utt.lang = ttsLang || "en-US";
    utt.rate = 0.88;
    utt.onend = () => {
      if (!enChainRef.current) return;
      speakSegEN(segIdx + 1, ttsLang);
    };
    utt.onerror = () => { enChainRef.current = false; setStatus("stopped"); };
    window.speechSynthesis.speak(utt);
  }, [slides]);

  const stopAll = useCallback(() => {
    enChainRef.current = false;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setStatus("stopped");
  }, []);

  const pauseAll = useCallback(() => {
    enChainRef.current = false;
    if (audioRef.current) audioRef.current.pause();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setStatus("paused");
  }, []);

  const playAudio = useCallback((fromSeg = seg) => {
    if (lang === "vi" && audioSrc) {
      if (!audioRef.current) return;
      if (status === "paused") {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.currentTime = audioTimestamps[fromSeg] ?? 0;
        audioRef.current.play().catch(() => {});
      }
      setStatus("playing");
    } else {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      enChainRef.current = true;
      speakSegEN(fromSeg, lang === "vi" ? "vi-VN" : "en-US");
      setStatus("playing");
    }
  }, [lang, audioSrc, seg, status, audioTimestamps, speakSegEN]);

  const handleReplay = useCallback(() => {
    enChainRef.current = false;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSeg(0);
    setTimeout(() => {
      if (lang === "vi" && audioSrc && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
        setStatus("playing");
      } else if (lang === "en" || (lang === "vi" && !audioSrc)) {
        enChainRef.current = true;
        speakSegEN(0, lang === "vi" ? "vi-VN" : "en-US");
        setStatus("playing");
      }
    }, 30);
  }, [lang, speakSegEN]);

  useEffect(() => () => stopAll(), [stopAll]);
  useEffect(() => { stopAll(); setSeg(0); }, [lang, stopAll]);

  const handleToggleAudio = () => {
    if (status === "playing") pauseAll();
    else playAudio();
  };

  const useTTS = lang === "en" || (lang === "vi" && !audioSrc);
  const ttsLang = lang === "vi" ? "vi-VN" : "en-US";

  const handlePrev = () => {
    if (seg <= 0) return;
    const next = seg - 1;
    if (lang === "vi" && audioSrc && audioRef.current) audioRef.current.currentTime = audioTimestamps[next] ?? 0;
    if (useTTS && status === "playing") {
      enChainRef.current = false;
      window.speechSynthesis.cancel();
      setTimeout(() => { enChainRef.current = true; speakSegEN(next, ttsLang); }, 30);
    } else {
      setSeg(next);
    }
    if (!useTTS || status !== "playing") setSeg(next);
  };
  const handleNext = () => {
    if (seg >= slides.length - 1) return;
    const next = seg + 1;
    if (lang === "vi" && audioSrc && audioRef.current) audioRef.current.currentTime = audioTimestamps[next] ?? 0;
    if (useTTS && status === "playing") {
      enChainRef.current = false;
      window.speechSynthesis.cancel();
      setTimeout(() => { enChainRef.current = true; speakSegEN(next, ttsLang); }, 30);
    } else {
      setSeg(next);
    }
    if (!useTTS || status !== "playing") setSeg(next);
  };

  return (
    <>
      <style>{NARRATOR_STYLES}</style>

      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          onEnded={() => { setStatus("stopped"); setSeg(0); }}
          onError={() => {}}
          onTimeUpdate={handleTimeUpdate}
          preload="auto"
        />
      )}

      {/* Nhân vật đứng bên phải marker */}
      {markerPos && (
        <div style={{
          position: "absolute",
          left: markerPos.x + 28,
          top: markerPos.y - 80,
          zIndex: 955, pointerEvents: "none",
          animation: "charAppear 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards",
        }}>
          <img
            src={`/img/main_page/${frame}.png`}
            alt="Mai"
            style={{ width: 88, height: 88, objectFit: "contain", imageRendering: "pixelated", filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.25))", display: "block" }}
          />
        </div>
      )}

      {/* Khung chat — hiện sau 2.2s */}
      {showChat && (
        <div style={{
          position: "absolute", bottom: 48, left: "50%",
          width: "min(400px, 84%)",
          background: "white",
          borderRadius: 18,
          boxShadow: "0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.06)",
          border: "1px solid rgba(0,0,0,0.07)",
          zIndex: 960,
          animation: "narratorSlideIn 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards",
          pointerEvents: "auto",
        }}>

          {/* Header */}
          <div style={{ padding: "0.65rem 0.85rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img src="/img/main_page/1.png" alt="Mai"
                style={{ width: 32, height: 32, objectFit: "contain", imageRendering: "pixelated" }} />
              <div>
                <p style={{ fontSize: "0.65rem", color: C.moss, fontWeight: 700, margin: 0 }}>
                  {status === "playing" ? "Mai đang nói..." : status === "paused" ? "Mai · Đang tạm dừng" : "Mai · Hướng dẫn viên"}
                </p>
                <p style={{ fontSize: "0.78rem", color: C.dark, fontWeight: 600, margin: 0, fontFamily: "'Playfair Display', serif" }}>{placeName}</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              <button onClick={() => setLang(l => l === "vi" ? "en" : "vi")}
                style={{ background: "#F5F0E8", border: "none", borderRadius: "2rem", padding: "0.22rem 0.7rem", color: C.dark, cursor: "pointer", fontSize: "0.7rem", fontWeight: 700, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                {lang === "vi" ? "🇬🇧 EN" : "🇻🇳 VI"}
              </button>
              <button onClick={onClose}
                style={{ width: 26, height: 26, borderRadius: "50%", background: "#F5F0E8", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: "0.95rem", fontWeight: 700 }}
                onMouseEnter={e => { e.currentTarget.style.background = "#FFE5E5"; e.currentTarget.style.color = "#c00"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#F5F0E8"; e.currentTarget.style.color = "#999"; }}>
                ×
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ padding: "0.4rem 0.85rem 0.2rem" }}>
            <div style={{ height: 3, borderRadius: 2, background: "rgba(61,90,62,0.1)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 2, background: C.moss, width: `${((seg + 1) / slides.length) * 100}%`, transition: "width 0.4s ease" }} />
            </div>
          </div>

          {/* Text bubble */}
          <div style={{ padding: "0.35rem 0.85rem 0.5rem" }}>
            {status === "playing" && (
              <div style={{ display: "flex", gap: 3, marginBottom: 5 }}>
                {[0, 0.18, 0.36].map(d => (
                  <div key={d} style={{ width: 5, height: 5, borderRadius: "50%", background: C.moss, animation: `dotPulse 1.2s ease-in-out ${d}s infinite` }} />
                ))}
              </div>
            )}
            <div key={`${seg}-${lang}`} style={{ animation: "textFadeIn 0.25s ease", background: "#F8F6F2", borderRadius: "3px 14px 14px 14px", padding: "0.65rem 0.85rem", border: "1px solid rgba(0,0,0,0.04)", minHeight: 52 }}>
              <p style={{ fontSize: "0.85rem", lineHeight: 1.75, color: C.dark, margin: 0 }}>{slides[seg]}</p>
            </div>
          </div>

          {/* Controls */}
          <div style={{ padding: "0 0.85rem 0.7rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {/* Play / Pause / Resume */}
              <button onClick={handleToggleAudio}
                style={{ display: "flex", alignItems: "center", gap: 6, background: status === "playing" ? "#FEF0EC" : "#EEF5EE", border: `1.5px solid ${status === "playing" ? C.rust : C.moss}`, borderRadius: "2rem", padding: "0.35rem 0.9rem", cursor: "pointer", color: status === "playing" ? C.rust : C.moss, fontSize: "0.74rem", fontWeight: 600, fontFamily: "'Be Vietnam Pro', sans-serif", transition: "all 0.2s" }}>
                {status === "playing"
                  ? (<><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>{lang === "vi" ? "Tạm dừng" : "Pause"}</>)
                  : status === "paused"
                  ? (<><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>{lang === "vi" ? "Tiếp tục" : "Resume"}</>)
                  : (<><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>{lang === "vi" ? "Nghe" : "Listen"}</>)
                }
              </button>
              {/* Phát lại từ đầu */}
              <button onClick={handleReplay} title={lang === "vi" ? "Phát lại từ đầu" : "Replay"}
                style={{ width: 28, height: 28, borderRadius: "50%", background: "#F5F0E8", border: "1px solid rgba(0,0,0,0.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#EEF5EE"; e.currentTarget.style.color = C.moss; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#F5F0E8"; e.currentTarget.style.color = "#888"; }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                </svg>
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <button onClick={handlePrev} disabled={seg === 0}
                style={{ width: 26, height: 26, borderRadius: "50%", background: seg === 0 ? "#f3f3f3" : "#EEF5EE", border: "none", cursor: seg === 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: seg === 0 ? "#ccc" : C.moss }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <span style={{ fontSize: "0.65rem", color: "#bbb", fontWeight: 600, minWidth: 34, textAlign: "center" }}>{seg + 1} / {slides.length}</span>
              <button onClick={handleNext} disabled={seg === slides.length - 1}
                style={{ width: 26, height: 26, borderRadius: "50%", background: seg === slides.length - 1 ? "#f3f3f3" : C.moss, border: "none", cursor: seg === slides.length - 1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: seg === slides.length - 1 ? "#ccc" : "white" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── MAP PAGE ───
export default function MapPage({ onBack, initialPlaceId, onGoLangMai }) {
  const [selected, setSelected] = useState(() =>
    initialPlaceId ? MAP_PLACES.find(p => p.id === initialPlaceId) ?? null : null
  );
  const [markerPixelPos, setMarkerPixelPos] = useState(null);
  const [search, setSearch] = useState("");
  const expandedRef = useRef(null);

  const activeStory = selected ? PLACE_STORIES[selected.id] : null;

  const filteredPlaces = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MAP_PLACES;
    return MAP_PLACES.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.sub && p.sub.toLowerCase().includes(q)) ||
      p.address.toLowerCase().includes(q) ||
      p.highlights.some(h => h.toLowerCase().includes(q))
    );
  }, [search]);

  const handleSelect = (place) => {
    if (place.id === "lang-mai" && onGoLangMai) { onGoLangMai(); return; }
    const next = selected?.id === place.id ? null : place;
    setSelected(next);
    if (next) {
      setTimeout(() => {
        expandedRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 80);
    }
  };

  const handleMarkerClick = useCallback((place) => {
    if (place.id === "lang-mai" && onGoLangMai) { onGoLangMai(); return; }
    setSelected(s => s?.id === place.id ? null : place);
  }, [onGoLangMai]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Be Vietnam Pro', sans-serif", overflow: "hidden" }}>
      <style>{globalStyles}</style>

      {/* Top bar */}
      <div style={{ height: 60, background: C.dark, display: "flex", alignItems: "center", padding: "0 2rem", gap: "1.25rem", flexShrink: 0, borderBottom: "1px solid rgba(200,150,62,0.18)" }}>
        <button onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 7, background: "transparent", border: "1.5px solid rgba(245,240,232,0.22)", color: C.cream, padding: "0.45rem 1rem", borderRadius: "2rem", cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.8rem", fontWeight: 500, transition: "all 0.2s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.gold; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(245,240,232,0.22)"; e.currentTarget.style.color = C.cream; }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          Quay lại
        </button>
        <div style={{ width: 1, height: 24, background: "rgba(245,240,232,0.12)" }} />
        <LogoIcon />
        <div>
          <span style={{ fontSize: "0.58rem", fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: C.gold, display: "block", lineHeight: 1.2 }}>Bản đồ</span>
          <span style={{ fontSize: "0.95rem", fontWeight: 600, color: C.cream, fontFamily: "'Playfair Display', serif" }}>Khám phá Bình Lợi</span>
        </div>
      </div>

      {/* Body: sidebar + map */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Sidebar ── */}
        <div style={{ width: 340, background: C.warmWhite, display: "flex", flexDirection: "column", flexShrink: 0, borderRight: "1px solid rgba(0,0,0,0.07)", overflow: "hidden" }}>

          {/* Header */}
          <div style={{ padding: "1.25rem 1.5rem 0.85rem", borderBottom: "1px solid rgba(0,0,0,0.06)", flexShrink: 0 }}>
            <p style={{ fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.24em", textTransform: "uppercase", color: C.moss, margin: "0 0 4px" }}>✦ Địa điểm nổi bật</p>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.18rem", color: C.dark, margin: 0 }}>Xã Bình Lợi, Bình Chánh</h3>
          </div>

          {/* Search bar */}
          <div style={{ padding: "0.65rem 1rem", borderBottom: "1px solid rgba(0,0,0,0.05)", flexShrink: 0 }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.2"
                style={{ position: "absolute", left: 10, pointerEvents: "none", flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Tìm địa điểm, hoạt động..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: "100%", padding: "0.5rem 2rem 0.5rem 2.1rem",
                  border: "1.5px solid rgba(0,0,0,0.09)", borderRadius: 10,
                  fontSize: "0.8rem", fontFamily: "'Be Vietnam Pro', sans-serif",
                  color: C.dark, background: "white", outline: "none",
                  transition: "border-color 0.18s", boxSizing: "border-box",
                }}
                onFocus={e => { e.target.style.borderColor = C.moss; }}
                onBlur={e => { e.target.style.borderColor = "rgba(0,0,0,0.09)"; }}
              />
              {search && (
                <button onClick={() => setSearch("")}
                  style={{ position: "absolute", right: 8, background: "none", border: "none", cursor: "pointer", color: "#bbb", fontSize: "1rem", lineHeight: 1, padding: "0 2px" }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#888"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "#bbb"; }}>
                  ×
                </button>
              )}
            </div>
            {search && (
              <p style={{ fontSize: "0.68rem", color: "#aaa", margin: "0.35rem 0 0", paddingLeft: 2 }}>
                {filteredPlaces.length > 0
                  ? `${filteredPlaces.length} địa điểm`
                  : "Không tìm thấy kết quả"}
              </p>
            )}
          </div>

          {/* Scrollable list with inline dropdowns */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem" }}>
            {filteredPlaces.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#bbb" }}>
                <p style={{ fontSize: "1.8rem", margin: "0 0 0.5rem" }}>🔍</p>
                <p style={{ fontSize: "0.82rem", margin: 0 }}>Không tìm thấy địa điểm phù hợp</p>
              </div>
            ) : (
              filteredPlaces.map(place => {
                const isOpen = selected?.id === place.id;
                return (
                  <div key={place.id} style={{ marginBottom: "0.5rem" }}>
                    {/* Card header — clickable */}
                    <button
                      onClick={() => handleSelect(place)}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 12,
                        padding: "0.85rem 1rem", width: "100%",
                        borderRadius: isOpen ? "12px 12px 0 0" : 12,
                        background: isOpen ? "#EEF5EE" : "white",
                        border: `1.5px solid ${isOpen ? C.moss : "rgba(0,0,0,0.06)"}`,
                        borderBottom: isOpen ? `1.5px solid ${C.moss}20` : undefined,
                        cursor: "pointer", textAlign: "left",
                        transition: "all 0.22s", boxShadow: isOpen ? "0 2px 12px rgba(61,90,62,0.1)" : "0 1px 6px rgba(0,0,0,0.04)",
                        fontFamily: "'Be Vietnam Pro', sans-serif",
                      }}
                      onMouseEnter={e => { if (!isOpen) e.currentTarget.style.boxShadow = "0 3px 12px rgba(0,0,0,0.09)"; }}
                      onMouseLeave={e => { if (!isOpen) e.currentTarget.style.boxShadow = "0 1px 6px rgba(0,0,0,0.04)"; }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: place.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem", flexShrink: 0, boxShadow: `0 2px 8px ${place.color}55` }}>
                        {place.imgIcon ? <img src={place.imgIcon} style={{ width: 34, height: 34, objectFit: "contain" }} alt="" /> : place.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: "0.86rem", color: C.dark, margin: "0 0 2px" }}>{place.name}</p>
                        {place.sub && <p style={{ fontSize: "0.7rem", color: C.gold, fontStyle: "italic", margin: "0 0 3px" }}>{place.sub}</p>}
                        <p style={{ fontSize: "0.69rem", color: "#999", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{place.address}</p>
                      </div>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={isOpen ? C.moss : "#ccc"} strokeWidth="2.5"
                        style={{ flexShrink: 0, marginTop: 3, transition: "transform 0.25s, stroke 0.2s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}>
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </button>

                    {/* Inline dropdown detail */}
                    <div
                      ref={isOpen ? expandedRef : null}
                      style={{
                        overflow: "hidden",
                        maxHeight: isOpen ? "520px" : "0",
                        opacity: isOpen ? 1 : 0,
                        transition: "max-height 0.38s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease",
                        borderRadius: "0 0 12px 12px",
                        border: isOpen ? `1.5px solid ${C.moss}30` : "none",
                        borderTop: "none",
                        background: "white",
                      }}
                    >
                      <div style={{ padding: "0.9rem 1rem 1rem" }}>
                        {/* Hours + best time */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.85rem" }}>
                          <div style={{ background: "#F7F4EF", borderRadius: 8, padding: "0.5rem 0.65rem" }}>
                            <p style={{ fontSize: "0.56rem", color: "#aaa", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 2px" }}>Giờ mở cửa</p>
                            <p style={{ fontSize: "0.77rem", fontWeight: 600, color: C.dark, margin: 0 }}>{place.hours}</p>
                          </div>
                          <div style={{ background: "#F7F4EF", borderRadius: 8, padding: "0.5rem 0.65rem" }}>
                            <p style={{ fontSize: "0.56rem", color: "#aaa", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 2px" }}>Thời điểm đẹp</p>
                            <p style={{ fontSize: "0.77rem", fontWeight: 600, color: C.dark, margin: 0 }}>{place.best}</p>
                          </div>
                        </div>

                        {/* Description */}
                        <p style={{ fontSize: "0.79rem", lineHeight: 1.75, color: "rgba(28,43,29,0.58)", marginBottom: "0.85rem" }}>{place.desc}</p>

                        {/* Highlights */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: "0.9rem" }}>
                          {place.highlights.map(h => (
                            <span key={h} style={{ background: `${place.color}12`, color: place.color, border: `1px solid ${place.color}28`, padding: "0.18rem 0.6rem", borderRadius: "2rem", fontSize: "0.68rem", fontWeight: 500 }}>{h}</span>
                          ))}
                        </div>

                        {/* Lang Mai story CTA */}
                        {place.id === "lang-mai" && onGoLangMai && (
                          <button
                            onClick={onGoLangMai}
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "0.6rem 1rem", borderRadius: 9, background: "#C8963E", color: "white", border: "none", cursor: "pointer", fontSize: "0.79rem", fontWeight: 600, fontFamily: "'Be Vietnam Pro', sans-serif", width: "100%", marginBottom: "0.5rem", transition: "opacity 0.18s" }}
                            onMouseEnter={e => { e.currentTarget.style.opacity = "0.83"; }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                          >
                            🌸 Khám phá câu chuyện mai vàng
                          </button>
                        )}

                        {/* Google Maps button */}
                        <a href={place.gmaps} target="_blank" rel="noopener noreferrer"
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "0.6rem 1rem", borderRadius: 9, background: place.color, color: "white", textDecoration: "none", fontSize: "0.79rem", fontWeight: 600, fontFamily: "'Be Vietnam Pro', sans-serif", transition: "opacity 0.18s" }}
                          onMouseEnter={e => { e.currentTarget.style.opacity = "0.83"; }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                          Mở Google Maps
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Map ── */}
        <div style={{ flex: 1, position: "relative" }}>
          <MapContainer center={[10.7814, 106.5135]} zoom={16} style={{ width: "100%", height: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            <FlyController target={selected} />

            {/* ── Tuyến đạp xe nổi bật ── */}
            <Polyline
              positions={CYCLING_ROUTE}
              pathOptions={{
                color: "#2E7D32",
                weight: selected?.id === "dap-xe" ? 8 : 5,
                opacity: selected?.id === "dap-xe" ? 1 : 0.72,
                dashArray: "14, 8",
                lineCap: "round",
                lineJoin: "round",
              }}
              eventHandlers={{
                click: () => setSelected(s => s?.id === "dap-xe" ? null : MAP_PLACES.find(p => p.id === "dap-xe")),
              }}
            />
            {/* Shadow line dưới để tạo chiều sâu */}
            <Polyline
              positions={CYCLING_ROUTE}
              pathOptions={{
                color: "#1B5E20",
                weight: selected?.id === "dap-xe" ? 12 : 8,
                opacity: 0.18,
                lineCap: "round",
              }}
            />

            {/* Theo dõi pixel position của marker đang được chọn */}
            {selected && (
              <MarkerPixelTracker
                pos={selected.pos}
                onPositionChange={setMarkerPixelPos}
              />
            )}
            <MemoizedMarkers
              places={MAP_PLACES}
              selectedId={selected?.id}
              onSelect={handleMarkerClick}
            />
          </MapContainer>

          {/* Place narrator — hiện khi có story */}
          {activeStory && (
            <PlaceNarrator
              key={selected.id}
              onClose={() => setSelected(null)}
              markerPos={markerPixelPos}
              storyData={activeStory}
            />
          )}

          {/* Hint */}
          {!activeStory && (
            <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 1000, background: "rgba(28,43,29,0.75)", color: C.cream, padding: "0.45rem 1.1rem", borderRadius: "2rem", fontSize: "0.72rem", backdropFilter: "blur(10px)", pointerEvents: "none", whiteSpace: "nowrap" }}>
              Click vào marker hoặc danh sách để xem chi tiết
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { MAP_PLACES };
