import type { RewardPosition, RewardPositions } from "./reward-layout";
export const rewardMaps = [
  {
    id: "study",
    name: "Góc học tập của con",
    icon: "📖",
    subtitle: "Một góc nhỏ, ngàn ý tưởng",
    color: "#eee5d7",
    welcome: "Bàn, ghế và kệ đã sẵn sàng. Cùng chọn món đầu tiên nhé!",
  },
  {
    id: "space",
    name: "Trạm vũ trụ",
    icon: "🪐",
    subtitle: "Chạm tới những vì sao",
    color: "#e4e3f7",
    welcome: "Trạm đã sẵn sàng. Con muốn mang gì vào chuyến khám phá?",
  },
  {
    id: "wildlife",
    name: "Sở thú hoang dã",
    icon: "🦒",
    subtitle: "Khu vườn của những người bạn",
    color: "#e3edda",
    welcome: "Thảo nguyên đang chờ. Cùng đón những người bạn đầu tiên!",
  },
  {
    id: "castle",
    name: "Lâu đài cổ tích",
    icon: "🏰",
    subtitle: "Viết câu chuyện của riêng con",
    color: "#f3e0ed",
    welcome: "Cánh cổng đã mở. Con sẽ kể câu chuyện gì hôm nay?",
  },
  {
    id: "robot",
    name: "Thành phố robot",
    icon: "🤖",
    subtitle: "Xây tương lai bằng trí tưởng tượng",
    color: "#daedf0",
    welcome: "Thành phố đã lên đèn. Cùng xây những điều kỳ diệu!",
  },
] as const;
export type RewardMapId = (typeof rewardMaps)[number]["id"];
export type RewardItem = {
  id: string;
  map: RewardMapId;
  name: string;
  price: number;
  icon: string;
  slot: string;
  description: string;
};
export type RewardItemId = RewardItem["id"];
export type RewardAction =
  | { action: "map"; mapId: RewardMapId }
  | { action: "buy" | "place" | "store"; itemId: string }
  | { action: "move"; itemId: string; position: RewardPosition }
  | { action: "reset_layout"; mapId: RewardMapId };
export const rewardItems: readonly RewardItem[] = [
  {
    id: "pencils",
    name: "Cốc đựng bút",
    price: 3,
    icon: "✏️",
    map: "study",
    slot: "pencils",
    description: "Những cây bút sẵn sàng cho ý tưởng mới.",
  },
  {
    id: "picture",
    name: "Tranh treo tường",
    price: 4,
    icon: "🖼️",
    map: "study",
    slot: "picture",
    description: "Một khoảng trời nhỏ trên tường của con.",
  },
  {
    id: "plant",
    name: "Chậu cây nhỏ",
    price: 5,
    icon: "🪴",
    map: "study",
    slot: "plant",
    description: "Một chút xanh cho bàn học của con.",
  },
  {
    id: "books",
    name: "Bộ sách trang trí",
    price: 6,
    icon: "📚",
    map: "study",
    slot: "books",
    description: "Những cuộc khám phá đang chờ trên kệ.",
  },
  {
    id: "lamp",
    name: "Đèn bàn",
    price: 8,
    icon: "💡",
    map: "study",
    slot: "lamp",
    description: "Thắp sáng góc nhỏ đầy ý tưởng.",
  },
  {
    id: "bear",
    name: "Thú bông",
    price: 10,
    icon: "🧸",
    map: "study",
    slot: "bear",
    description: "Một người bạn êm ái ngồi bên con.",
  },
  {
    id: "chair",
    name: "Ghế màu mới",
    price: 12,
    icon: "🪑",
    map: "study",
    slot: "chair",
    description: "Chiếc ghế tím dịu cho góc học tập.",
  },
  {
    id: "desk",
    name: "Mẫu bàn học mới",
    price: 15,
    icon: "🪵",
    map: "study",
    slot: "desk",
    description: "Chiếc bàn xanh mát mang phong cách của con.",
  },
  {
    id: "star-lamp",
    map: "space",
    name: "Đèn ngôi sao",
    price: 3,
    icon: "⭐",
    slot: "star-lamp",
    description: "Thắp một vì sao ấm áp trong trạm.",
  },
  {
    id: "moon-garden",
    map: "space",
    name: "Vườn Mặt Trăng",
    price: 4,
    icon: "🌱",
    slot: "moon-garden",
    description: "Mầm xanh đầu tiên trên hành tinh mới.",
  },
  {
    id: "space-satellite",
    map: "space",
    name: "Vệ tinh nhỏ",
    price: 5,
    icon: "🛰️",
    slot: "space-satellite",
    description: "Gửi lời chào đi khắp vũ trụ.",
  },
  {
    id: "space-telescope",
    map: "space",
    name: "Kính thiên văn",
    price: 6,
    icon: "🔭",
    slot: "space-telescope",
    description: "Nhìn xa hơn tới những điều chưa biết.",
  },
  {
    id: "space-rover",
    map: "space",
    name: "Xe thám hiểm",
    price: 8,
    icon: "🛞",
    slot: "space-rover",
    description: "Cùng tìm dấu chân trên mặt trăng.",
  },
  {
    id: "space-astronaut",
    map: "space",
    name: "Bạn phi hành gia",
    price: 10,
    icon: "🧑‍🚀",
    slot: "space-astronaut",
    description: "Người bạn đồng hành giữa các vì sao.",
  },
  {
    id: "space-ufo",
    map: "space",
    name: "Đĩa bay cầu vồng",
    price: 12,
    icon: "🛸",
    slot: "space-ufo",
    description: "Một vị khách từ thiên hà xa xôi.",
  },
  {
    id: "space-rocket",
    map: "space",
    name: "Tên lửa khám phá",
    price: 15,
    icon: "🚀",
    slot: "space-rocket",
    description: "Sẵn sàng cho chuyến du hành mới!",
  },
  {
    id: "wildlife-flowers",
    map: "wildlife",
    name: "Khóm hoa dại",
    price: 3,
    icon: "🌼",
    slot: "wildlife-flowers",
    description: "Một chút sắc màu trên thảo nguyên.",
  },
  {
    id: "wildlife-tree",
    map: "wildlife",
    name: "Cây bóng mát",
    price: 4,
    icon: "🌳",
    slot: "wildlife-tree",
    description: "Bóng mát cho những người bạn nhỏ.",
  },
  {
    id: "wildlife-parrot",
    map: "wildlife",
    name: "Vẹt nhiều màu",
    price: 5,
    icon: "🦜",
    slot: "wildlife-parrot",
    description: "Lời chào líu lo từ tán cây.",
  },
  {
    id: "wildlife-turtle",
    map: "wildlife",
    name: "Rùa thong thả",
    price: 6,
    icon: "🐢",
    slot: "wildlife-turtle",
    description: "Chậm rãi khám phá từng điều thú vị.",
  },
  {
    id: "wildlife-zebra",
    map: "wildlife",
    name: "Ngựa vằn",
    price: 8,
    icon: "🦓",
    slot: "wildlife-zebra",
    description: "Những bước chân vui trên đồng cỏ.",
  },
  {
    id: "wildlife-giraffe",
    map: "wildlife",
    name: "Hươu cao cổ",
    price: 10,
    icon: "🦒",
    slot: "wildlife-giraffe",
    description: "Người bạn vươn cao tới những tán lá.",
  },
  {
    id: "wildlife-elephant",
    map: "wildlife",
    name: "Voi hiền lành",
    price: 12,
    icon: "🐘",
    slot: "wildlife-elephant",
    description: "Một người bạn lớn với trái tim ấm áp.",
  },
  {
    id: "wildlife-lion",
    map: "wildlife",
    name: "Sư tử nhỏ",
    price: 15,
    icon: "🦁",
    slot: "wildlife-lion",
    description: "Vị vua đáng yêu của thảo nguyên.",
  },
  {
    id: "castle-mushroom",
    map: "castle",
    name: "Nấm thần kỳ",
    price: 3,
    icon: "🍄",
    slot: "castle-mushroom",
    description: "Một bí mật nhỏ bên đường vào lâu đài.",
  },
  {
    id: "castle-flowers",
    map: "castle",
    name: "Vườn hoa phép thuật",
    price: 4,
    icon: "🌷",
    slot: "castle-flowers",
    description: "Những bông hoa trong câu chuyện của con.",
  },
  {
    id: "castle-unicorn",
    map: "castle",
    name: "Ngựa một sừng",
    price: 5,
    icon: "🦄",
    slot: "castle-unicorn",
    description: "Người bạn bước ra từ truyện cổ tích.",
  },
  {
    id: "castle-fairy",
    map: "castle",
    name: "Bạn tiên nhỏ",
    price: 6,
    icon: "🧚",
    slot: "castle-fairy",
    description: "Rắc một chút phép màu lên khu vườn.",
  },
  {
    id: "castle-fountain",
    map: "castle",
    name: "Đài phun nước",
    price: 8,
    icon: "⛲",
    slot: "castle-fountain",
    description: "Dòng nước trong veo giữa sân lâu đài.",
  },
  {
    id: "castle-carriage",
    map: "castle",
    name: "Xe ngựa hoàng gia",
    price: 10,
    icon: "🎠",
    slot: "castle-carriage",
    description: "Cùng đi qua miền đất của những câu chuyện.",
  },
  {
    id: "castle-dragon",
    map: "castle",
    name: "Rồng nhỏ thân thiện",
    price: 12,
    icon: "🐉",
    slot: "castle-dragon",
    description: "Người giữ những giấc mơ bay xa.",
  },
  {
    id: "castle-tower",
    map: "castle",
    name: "Tháp cầu vồng",
    price: 15,
    icon: "🏰",
    slot: "castle-tower",
    description: "Thêm một tòa tháp cho vương quốc của con.",
  },
  {
    id: "robot-sign",
    map: "robot",
    name: "Biển chào tương lai",
    price: 3,
    icon: "🪧",
    slot: "robot-sign",
    description: "Một lời chào cho khách ghé thành phố.",
  },
  {
    id: "robot-tree",
    map: "robot",
    name: "Cây năng lượng",
    price: 4,
    icon: "🌳",
    slot: "robot-tree",
    description: "Một khoảng xanh giữa thành phố thông minh.",
  },
  {
    id: "robot-solar",
    map: "robot",
    name: "Trạm năng lượng",
    price: 5,
    icon: "☀️",
    slot: "robot-solar",
    description: "Thu ánh nắng để thắp sáng thành phố.",
  },
  {
    id: "robot-helper",
    map: "robot",
    name: "Robot giúp việc",
    price: 6,
    icon: "🤖",
    slot: "robot-helper",
    description: "Người bạn nhỏ luôn sẵn sàng giúp đỡ.",
  },
  {
    id: "robot-bus",
    map: "robot",
    name: "Xe buýt tự lái",
    price: 8,
    icon: "🚎",
    slot: "robot-bus",
    description: "Chuyến xe vui đi qua những con phố.",
  },
  {
    id: "robot-drone",
    map: "robot",
    name: "Drone giao quà",
    price: 10,
    icon: "🛸",
    slot: "robot-drone",
    description: "Mang niềm vui bay khắp thành phố.",
  },
  {
    id: "robot-lab",
    map: "robot",
    name: "Phòng sáng chế",
    price: 12,
    icon: "🔬",
    slot: "robot-lab",
    description: "Nơi những ý tưởng mới bắt đầu.",
  },
  {
    id: "robot-tower",
    map: "robot",
    name: "Tháp tương lai",
    price: 15,
    icon: "🏙️",
    slot: "robot-tower",
    description: "Một công trình cho trí tưởng tượng bay cao.",
  },
];
export type RewardEvent = {
  id: string;
  runId: string;
  stars: number;
  message: string;
  date: string;
};
export type RewardState = {
  version: 1;
  activeMap?: RewardMapId;
  positions?: RewardPositions;
  balance: number;
  owned: RewardItemId[];
  placed: RewardItemId[];
  events: RewardEvent[];
  completed: string[];
  corrected: string[];
};
export type RewardView = Pick<
  RewardState,
  "balance" | "owned" | "placed" | "events"
> & {
  activeMap: RewardMapId;
  positions: RewardPositions;
  lessonProgress: number;
  receipt?: RewardEvent[];
};
export const emptyRewards = (): RewardState => ({
  version: 1,
  activeMap: "study",
  balance: 0,
  owned: [],
  placed: [],
  events: [],
  completed: [],
  corrected: [],
});
export function rewardView(state: RewardState, runId?: string): RewardView {
  return {
    activeMap: state.activeMap ?? "study",
    positions: state.positions ?? {},
    balance: state.balance,
    owned: state.owned,
    placed: state.placed,
    events: state.events,
    lessonProgress: state.completed.length % 3,
    ...(runId
      ? { receipt: state.events.filter((e) => e.runId === runId) }
      : {}),
  };
}
