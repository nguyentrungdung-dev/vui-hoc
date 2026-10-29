import { rewardItems, type RewardItem, type RewardMapId } from "./rewards";

const artRoot = "/assets/rewards/storybook-v1";
export const rewardBackground = (mapId: RewardMapId) =>
  `${artRoot}/${mapId}-background.webp`;
export function rewardSticker(item: RewardItem) {
  const index = rewardItems
    .filter((entry) => entry.map === item.map)
    .findIndex((entry) => entry.id === item.id);
  return `${artRoot}/${item.map}-${index}.webp`;
}
export const rewardStories = {
  study: {
    chapter: "01",
    title: "Căn gác của những ước mơ",
    shortTitle: "Căn gác nhỏ",
    guide: "Gấu Mây",
    guideItem: "bear",
    role: "Người giữ những ý tưởng nhỏ",
    color: "#c48749",
    invitation:
      "Gấu Mây vừa tìm được một căn gác ngập nắng. Con cùng bạn biến nơi này thành góc dành cho những ý tưởng thật hay nhé!",
    mission: "Chọn một món đồ để căn gác ấm áp hơn.",
    paragraphs: [
      "Ở cuối khu vườn có một căn gác nhỏ, nơi nắng sớm ghé qua cửa sổ mỗi ngày. Gấu Mây tìm thấy nơi ấy cùng một chiếc bàn gỗ và rất nhiều chỗ trống cho trí tưởng tượng.",
      "Bạn muốn có nơi để đọc một cuốn sách, vẽ một bức tranh và cất những câu hỏi chưa tìm ra lời đáp. Nhưng căn gác sẽ trông như thế nào? Gấu Mây muốn nghe ý tưởng của con.",
      "Mỗi điều con học được có thể mang về một ngôi sao. Con dùng sao để chọn đồ, rồi tự sắp xếp căn gác. Không cần vội, những ý tưởng hay luôn có thể đợi lần ghé thăm tiếp theo.",
    ],
    stages: [
      "Căn gác vừa mở cửa",
      "Ý tưởng đầu tiên đã đến",
      "Một góc nhỏ thật ấm áp",
      "Căn gác mang tên trí tưởng tượng",
    ],
    discoveries: [
      "Một chiếc cốc bút, một chậu cây… món nào sẽ mở đầu câu chuyện?",
      "Gấu Mây đã thấy dấu ấn đầu tiên của con. Con muốn đặt món tiếp theo ở đâu?",
      "Căn gác đang có nhiều điều để khám phá. Thử sắp lại đồ và kể một câu chuyện mới nhé.",
      "Con đã gặp đủ tám món đồ. Câu chuyện vẫn tiếp tục mỗi khi con sắp xếp lại căn gác!",
    ],
    thanks:
      "Gấu Mây có thêm một điều để mỉm cười. Căn gác đang ấm áp hơn nhờ con!",
  },
  space: {
    chapter: "02",
    title: "Lời chào từ phía Mặt Trăng",
    shortTitle: "Trạm vũ trụ",
    guide: "Phi hành gia Mít",
    guideItem: "space-astronaut",
    role: "Bạn đồng hành giữa những vì sao",
    color: "#7462a8",
    invitation:
      "Một tín hiệu nhỏ vừa đến từ Mặt Trăng: trạm của Mít đã sẵn sàng! Con muốn chuẩn bị những gì cho chuyến khám phá đầu tiên?",
    mission: "Chuẩn bị trạm cho một chuyến đi đầy tò mò.",
    paragraphs: [
      "Bíp… bíp… Một lời chào vừa bay qua bầu trời đêm. Phi hành gia Mít đã tới Mặt Trăng và tìm được một nơi thật yên tĩnh để dựng trạm khám phá.",
      "Ở đây có những miệng hố tròn, những ngôi sao xa và rất nhiều câu hỏi thú vị. Mít cần một người cùng nghĩ xem nên mang kính thiên văn, xe thám hiểm hay một mầm cây nhỏ đến trước.",
      "Người đồng hành ấy chính là con. Mang theo những ngôi sao từ bài học, chọn đồ cho trạm và sắp xếp theo cách của mình. Chuyến đi không có giờ khởi hành cố định: Mít luôn sẵn sàng khi con quay lại.",
    ],
    stages: [
      "Tín hiệu đầu tiên",
      "Trạm có thêm một người bạn",
      "Sẵn sàng cho chuyến khám phá",
      "Một vũ trụ rất riêng",
    ],
    discoveries: [
      "Điều gì khiến con tò mò nhất ở Mặt Trăng? Chọn một món để bắt đầu nhé.",
      "Tín hiệu đã rõ hơn rồi! Mít đang chờ nghe ý tưởng sắp xếp của con.",
      "Trạm ngày càng rộn ràng. Con thử tạo một góc quan sát các vì sao nhé.",
      "Tám người bạn và vật dụng đã sẵn sàng. Con muốn kể chuyến phiêu lưu nào tiếp theo?",
    ],
    thanks:
      "Mít gửi con một lời chào từ Mặt Trăng: trạm của chúng mình vừa có thêm điều thú vị!",
  },
  wildlife: {
    chapter: "03",
    title: "Lá thư từ thảo nguyên",
    shortTitle: "Sở thú hoang dã",
    guide: "Hươu Lá",
    guideItem: "wildlife-giraffe",
    role: "Người bạn của những tán cây",
    color: "#64875c",
    invitation:
      "Sau cơn mưa, thảo nguyên xanh trở lại. Hươu Lá rủ con tạo một nơi thật dễ thương để những người bạn ghé thăm.",
    mission: "Đón những người bạn về khoảng xanh của con.",
    paragraphs: [
      "Sau một đêm mưa dịu, những giọt nước còn nằm trên lá. Hươu Lá nhìn quanh đồng cỏ và tìm thấy một khoảng xanh bên hồ nước nhỏ.",
      "Bạn gửi con một lá thư: “Ở đây có chỗ cho những bông hoa, bóng cây và nhiều người bạn. Con muốn ai ghé thăm trước?” Một chú rùa thong thả, một bạn voi hiền lành hay một chú vẹt thích chuyện trò?",
      "Mỗi bạn đều có một chỗ trong câu chuyện. Con có thể học, nhận sao rồi tự chọn và sắp xếp thảo nguyên. Không cần đón tất cả cùng một lúc; mỗi cuộc gặp nhỏ đều là một niềm vui.",
    ],
    stages: [
      "Khoảng xanh sau cơn mưa",
      "Cuộc gặp đầu tiên",
      "Thảo nguyên có thêm tiếng cười",
      "Một nơi dành cho mọi người bạn",
    ],
    discoveries: [
      "Đồng cỏ còn nhiều chỗ trống. Con muốn trồng hoa hay đón một người bạn?",
      "Một cuộc gặp nhỏ vừa bắt đầu. Con hãy chọn một chỗ thật đẹp cho bạn nhé.",
      "Hươu Lá đang có nhiều bạn để chuyện trò. Con sẽ sắp xếp góc nào tiếp theo?",
      "Tám món đồ và người bạn đã có mặt. Con thử kể một ngày vui trên thảo nguyên nhé!",
    ],
    thanks:
      "Hươu Lá nghiêng đầu chào con. Thảo nguyên vừa có thêm một niềm vui nho nhỏ!",
  },
  castle: {
    chapter: "04",
    title: "Khu vườn biết kể chuyện",
    shortTitle: "Lâu đài cổ tích",
    guide: "Tiên Nắng",
    guideItem: "castle-fairy",
    role: "Người gieo những câu chuyện",
    color: "#ae7296",
    invitation:
      "Cánh cổng lâu đài hé mở, nhưng câu chuyện trong khu vườn vẫn còn để trống. Tiên Nắng mời con cùng viết tiếp bằng trí tưởng tượng.",
    mission: "Thêm một chút phép màu vào khu vườn cổ tích.",
    paragraphs: [
      "Ngày xưa, ở một vương quốc rất nhỏ, có khu vườn biết lắng nghe. Mỗi khi ai đó kể một ý tưởng mới, một chiếc lá lại khẽ rung lên.",
      "Tiên Nắng tìm thấy cuốn truyện chưa viết xong bên cánh cổng. Trong đó có chỗ cho nấm thần kỳ, một bạn ngựa một sừng và cả chú rồng nhỏ rất thích kết bạn. Nhưng chưa ai quyết định họ sẽ gặp nhau ở đâu.",
      "Con có thể viết tiếp câu chuyện bằng cách chọn đồ và tự sắp xếp khu vườn. Những ngôi sao từ bài học sẽ giúp con mang thêm phép màu đến. Còn điều kỳ diệu nhất là không có hai khu vườn nào giống hệt nhau.",
    ],
    stages: [
      "Cánh cổng hé mở",
      "Một chút phép màu đầu tiên",
      "Khu vườn bắt đầu kể chuyện",
      "Câu chuyện do con viết",
    ],
    discoveries: [
      "Trang truyện đầu tiên đang chờ. Con muốn mở đầu bằng điều kỳ diệu nào?",
      "Một chiếc lá vừa rung lên! Tiên Nắng đã nghe thấy ý tưởng đầu tiên của con.",
      "Trong vườn đang có nhiều câu chuyện nhỏ. Con thử thay chỗ các bạn để kể câu chuyện khác nhé.",
      "Con đã sưu tầm đủ tám điều kỳ diệu. Mỗi lần sắp xếp lại là một trang truyện mới!",
    ],
    thanks:
      "Tiên Nắng thì thầm: một trang truyện mới vừa xuất hiện trong khu vườn của con!",
  },
  robot: {
    chapter: "05",
    title: "Thành phố của những điều tử tế",
    shortTitle: "Thành phố robot",
    guide: "Robot Bắp",
    guideItem: "robot-helper",
    role: "Nhà sáng chế thích sẻ chia",
    color: "#4e8b8c",
    invitation:
      "Robot Bắp có một bản vẽ thành phố và một ý tưởng: mỗi phát minh sẽ giúp ai đó vui hơn. Con cùng Bắp xây nơi ấy nhé!",
    mission: "Xây một thành phố nơi mỗi ý tưởng đều có ích.",
    paragraphs: [
      "Robot Bắp vừa vẽ xong con đường đầu tiên. Bạn không muốn thành phố chỉ có những tòa nhà cao, mà còn có bóng cây, những chuyến xe vui và lời chào thân thiện.",
      "Bắp mơ về một chiếc drone mang quà, một trạm thu ánh nắng và một phòng nhỏ nơi mọi người cùng sáng chế. Nhưng bạn biết những ý tưởng hay nhất thường xuất hiện khi có người cùng nghĩ.",
      "Vì vậy Bắp mời con làm người bạn đồng hành. Học một điều mới, mang sao về và chọn thêm một phát minh. Con tự quyết định thành phố trông như thế nào, còn Bắp sẽ luôn chờ nghe ý tưởng tiếp theo.",
    ],
    stages: [
      "Bản vẽ đầu tiên",
      "Một phát minh đã đến",
      "Những con phố đầy ý tưởng",
      "Thành phố mang dấu ấn của con",
    ],
    discoveries: [
      "Con muốn bắt đầu bằng một lời chào, một khoảng xanh hay một người bạn robot?",
      "Bắp đã ghi thêm ý tưởng của con vào bản vẽ. Con muốn đặt nó ở góc nào?",
      "Thành phố có thêm nhiều điều hữu ích. Thử sắp xếp một con phố thật vui nhé.",
      "Tám phát minh đã sẵn sàng. Con vẫn có thể tạo thật nhiều thành phố khác nhau từ chúng!",
    ],
    thanks:
      "Bắp bật đèn mắt vui vẻ: thành phố vừa có thêm một ý tưởng tuyệt vời từ con!",
  },
} as const;
export function rewardStoryStage(count: number) {
  return count >= 8 ? 3 : count >= 4 ? 2 : count >= 1 ? 1 : 0;
}
