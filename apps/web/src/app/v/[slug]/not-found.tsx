import Link from 'next/link';

export default function ShortFormNotFound() {
  return (
    <main>
      <h1>영상을 찾을 수 없어요</h1>
      <p className="caption">링크가 잘못되었거나 삭제된 영상입니다.</p>
      <Link className="cta" href="/">
        Vobby 알아보기
      </Link>
    </main>
  );
}
