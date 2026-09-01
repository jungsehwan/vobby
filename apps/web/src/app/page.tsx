export default function LandingPage() {
  return (
    <main>
      <h1>Vobby</h1>
      <p>
        사진만 있으면 됩니다. 갤러리 속 사진의 시간과 위치로 여행 타임라인을
        자동으로 만들고, 나만의 여행 숏폼 영상으로 완성해 드려요.
      </p>
      <div className="card">
        <strong>이렇게 동작해요</strong>
        <p className="caption">
          1. 사진을 스캔하면 여행이 자동으로 묶여요 <br />
          2. AI가 베스트 컷을 골라 타임라인을 구성해요 <br />
          3. 이동 경로와 함께 숏폼 영상이 만들어져요
        </p>
      </div>
      <p className="caption">앱은 현재 준비 중입니다.</p>
    </main>
  );
}
