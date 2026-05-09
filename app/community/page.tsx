"use client";

import { useState } from "react";

type Category = "혼잡" | "시설" | "안전" | "서비스" | "기타";
type Status = "접수됨" | "검토중" | "처리완료" | "답변완료";

interface Reply {
  author: string;
  content: string;
  date: string;
  isStaff: boolean;
}

interface Post {
  id: number;
  title: string;
  content: string;
  category: Category;
  line: string;
  station: string;
  author: string;
  date: string;
  status: Status;
  views: number;
  replies: Reply[];
  isCurrentUser?: boolean;
}

const MOCK_POSTS: Post[] = [
  {
    id: 1,
    title: "2호선 강남역 환승 칸 혼잡도가 너무 심합니다",
    content: "출퇴근 시간에 5번 칸 환승 통로 앞이 너무 혼잡해서 부상 위험이 있을 것 같습니다. 혼잡도 분산 방안을 마련해 주시면 좋겠습니다.",
    category: "혼잡",
    line: "2호선",
    station: "강남",
    author: "지하철유저123",
    date: "2026-04-30",
    status: "답변완료",
    views: 342,
    replies: [
      {
        author: "코레일 고객센터",
        content: "안녕하세요. 강남역 환승 혼잡 문제를 인지하고 있습니다. 5번 칸 부근 안내 직원을 오전 7~9시 추가 배치하겠습니다. 불편을 드려 죄송합니다.",
        date: "2026-05-01",
        isStaff: true,
      },
    ],
  },
  {
    id: 2,
    title: "왕십리역 임산부 배려석 표시가 잘 안 보여요",
    content: "임산부 배려석(분홍 좌석) 안내판이 오래되어 색이 바랬습니다. 새로 교체해 주시면 감사하겠습니다.",
    category: "시설",
    line: "5호선",
    station: "왕십리",
    author: "배려씩씩",
    date: "2026-05-01",
    status: "검토중",
    views: 128,
    replies: [],
  },
  {
    id: 3,
    title: "9호선 급행 혼잡도 개선 건의",
    content: "여의도역 급행 탑승 시 칸마다 혼잡도 차이가 매우 큽니다. 앞 칸에 몰리는 현상을 개선해 주세요.",
    category: "혼잡",
    line: "9호선",
    station: "여의도",
    author: "급행러버",
    date: "2026-05-02",
    status: "접수됨",
    views: 67,
    replies: [],
  },
  {
    id: 4,
    title: "도봉산역 등산객 대응 추가 안내 요청",
    content: "주말 이른 아침 도봉산역에 등산객이 몰려 혼잡합니다. 전동차 내 위치 안내 방송을 강화해 주시면 좋겠습니다.",
    category: "서비스",
    line: "7호선",
    station: "도봉산",
    author: "등산매니아",
    date: "2026-05-02",
    status: "처리완료",
    views: 205,
    replies: [
      {
        author: "코레일 운영팀",
        content: "주말 도봉산 방면 분산 승차 안내 방송을 강화하겠습니다. 좋은 의견 감사합니다.",
        date: "2026-05-03",
        isStaff: true,
      },
    ],
  },
];

const STATUS_STYLES: Record<Status, string> = {
  접수됨: "bg-gray-100 text-gray-600",
  검토중: "bg-blue-100 text-blue-600",
  처리완료: "bg-green-100 text-green-600",
  답변완료: "bg-purple-100 text-purple-600",
};

const CATEGORY_ICONS: Record<Category, string> = {
  혼잡: "🚶",
  시설: "🔧",
  안전: "⚠️",
  서비스: "💬",
  기타: "📝",
};

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);
  const [isStaffView, setIsStaffView] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [filterCategory, setFilterCategory] = useState<"전체" | Category>("전체");

  // New post form state
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("혼잡");
  const [newLine, setNewLine] = useState("");
  const [newStation, setNewStation] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleNewPost = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    const post: Post = {
      id: Date.now(),
      title: newTitle,
      content: newContent,
      category: newCategory,
      line: newLine || "미지정",
      station: newStation || "미지정",
      author: "나",
      date: new Date().toISOString().slice(0, 10),
      status: "접수됨",
      views: 1,
      replies: [],
      isCurrentUser: true,
    };
    setPosts((prev) => [post, ...prev]);
    setShowNewForm(false);
    setSubmitSuccess(true);
    setNewTitle("");
    setNewContent("");
    setNewLine("");
    setNewStation("");
    setTimeout(() => setSubmitSuccess(false), 4000);
  };

  const handleReply = () => {
    if (!replyText.trim() || !selectedPost) return;
    const reply: Reply = {
      author: isStaffView ? "코레일 운영팀" : "나",
      content: replyText,
      date: new Date().toISOString().slice(0, 10),
      isStaff: isStaffView,
    };
    const newStatus: Status = isStaffView ? "답변완료" : selectedPost.status;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === selectedPost.id
          ? { ...p, replies: [...p.replies, reply], status: newStatus }
          : p
      )
    );
    setSelectedPost((prev) =>
      prev ? { ...prev, replies: [...prev.replies, reply], status: newStatus } : null
    );
    setReplyText("");
  };

  const CATEGORIES: ("전체" | Category)[] = ["전체", "혼잡", "시설", "안전", "서비스", "기타"];
  const filtered =
    filterCategory === "전체" ? posts : posts.filter((p) => p.category === filterCategory);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-500 to-red-700 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">민원 커뮤니티</h1>
        <p className="text-red-100 text-sm">
          불편사항을 공유하고 코레일 직원이 직접 답변드립니다.
        </p>
      </div>

      {/* Staff toggle */}
      <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div>
          <p className="font-semibold text-gray-800 text-sm">
            {isStaffView ? "🛡️ 코레일 직원 모드" : "👤 일반 사용자 모드"}
          </p>
          <p className="text-xs text-gray-400">
            {isStaffView ? "민원 답변 및 상태 변경 가능" : "민원 등록 및 조회 가능"}
          </p>
        </div>
        <button
          onClick={() => setIsStaffView((v) => !v)}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all
            ${isStaffView ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-600 border-gray-200 hover:border-red-400"}`}
        >
          {isStaffView ? "직원 모드 ON" : "직원 모드 OFF"}
        </button>
      </div>

      {selectedPost ? (
        /* Post detail view */
        <div className="space-y-4">
          <button
            onClick={() => setSelectedPost(null)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            ← 목록으로
          </button>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{CATEGORY_ICONS[selectedPost.category]}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[selectedPost.status]}`}>
                {selectedPost.status}
              </span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {selectedPost.category}
              </span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">{selectedPost.title}</h2>
            <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
              <span>{selectedPost.line} · {selectedPost.station}역</span>
              <span>·</span>
              <span>{selectedPost.author}</span>
              <span>·</span>
              <span>{selectedPost.date}</span>
              <span>·</span>
              <span>조회 {selectedPost.views}</span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed border-t pt-4">{selectedPost.content}</p>
          </div>

          {/* Replies */}
          {selectedPost.replies.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 text-sm">답변 ({selectedPost.replies.length})</h3>
              {selectedPost.replies.map((reply, i) => (
                <div
                  key={i}
                  className={`rounded-xl p-4 border ${reply.isStaff ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {reply.isStaff && <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-medium">코레일 공식</span>}
                    <span className="text-sm font-semibold text-gray-800">{reply.author}</span>
                    <span className="text-xs text-gray-400">{reply.date}</span>
                  </div>
                  <p className="text-sm text-gray-700">{reply.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Reply input */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-800 text-sm mb-3">
              {isStaffView ? "🛡️ 공식 답변 작성" : "💬 댓글 작성"}
            </h3>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={isStaffView ? "민원인에게 공식 답변을 작성해 주세요." : "의견을 남겨주세요."}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 min-h-[80px] resize-none"
            />
            <button
              onClick={handleReply}
              disabled={!replyText.trim()}
              className="mt-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-medium rounded-lg text-sm transition-all"
            >
              {isStaffView ? "공식 답변 등록" : "댓글 등록"}
            </button>
          </div>
        </div>
      ) : (
        /* Post list view */
        <>
          {/* New post button */}
          {!isStaffView && !showNewForm && (
            <button
              onClick={() => setShowNewForm(true)}
              className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-md transition-all"
            >
              + 민원 등록하기
            </button>
          )}

          {submitSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm font-medium text-center">
              ✓ 민원이 접수되었습니다.
            </div>
          )}

          {/* New post form */}
          {showNewForm && (
            <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
              <h2 className="font-bold text-gray-800">민원 내용 입력</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">카테고리</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as Category)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  >
                    {(["혼잡", "시설", "안전", "서비스", "기타"] as Category[]).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">노선 (선택)</label>
                  <input
                    type="text"
                    placeholder="예: 2호선"
                    value={newLine}
                    onChange={(e) => setNewLine(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">역 (선택)</label>
                <input
                  type="text"
                  placeholder="예: 강남"
                  value={newStation}
                  onChange={(e) => setNewStation(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">제목</label>
                <input
                  type="text"
                  placeholder="민원 제목을 입력해 주세요."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">내용</label>
                <textarea
                  placeholder="불편하셨던 점이나 개선 요청사항을 자세히 적어주세요."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 min-h-[100px] resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowNewForm(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-all">
                  취소
                </button>
                <button onClick={handleNewPost} disabled={!newTitle.trim() || !newContent.trim()} className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 disabled:bg-gray-200 disabled:text-gray-400 transition-all">
                  등록하기
                </button>
              </div>
            </section>
          )}

          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all
                  ${filterCategory === cat ? "bg-red-500 text-white border-transparent" : "bg-white border-gray-200 text-gray-600 hover:border-red-300"}`}
              >
                {cat !== "전체" && CATEGORY_ICONS[cat as Category]} {cat}
              </button>
            ))}
          </div>

          {/* Post list */}
          <section className="space-y-3">
            {filtered.map((post) => (
              <button
                key={post.id}
                onClick={() => {
                  setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, views: p.views + 1 } : p));
                  setSelectedPost({ ...post, views: post.views + 1 });
                }}
                className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-left hover:border-red-200 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{CATEGORY_ICONS[post.category]}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[post.status]}`}>
                    {post.status}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{post.category}</span>
                  {post.isCurrentUser && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">내 글</span>}
                </div>
                <p className="font-semibold text-gray-800 text-sm mb-1 line-clamp-1">{post.title}</p>
                <p className="text-xs text-gray-500 line-clamp-1 mb-2">{post.content}</p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{post.line} · {post.station}역</span>
                  <span>·</span>
                  <span>{post.author}</span>
                  <span>·</span>
                  <span>{post.date}</span>
                  <span className="ml-auto">조회 {post.views} · 답변 {post.replies.length}</span>
                </div>
              </button>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
