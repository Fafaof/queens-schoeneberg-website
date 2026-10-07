// "Was geht im Kiez": lädt die Beiträge vom Server (/api/posts) und setzt sie
// in die Seite ein. Gepflegt werden sie im Verwaltungsbereich (/verwaltung/).
(async () => {
  const container = document.getElementById('blog-posts');
  if (!container) return;
  const lang = currentLang;
  const showEmpty = () => {
    const note = document.createElement('p');
    note.className = 'blog-empty';
    note.dataset.i18n = 'blog_empty';
    note.textContent = translations.blog_empty[lang];
    container.replaceChildren(note);
  };

  let posts;
  try {
    const response = await fetch('/api/posts', { cache: 'no-store' });
    if (!response.ok) throw new Error(String(response.status));
    posts = await response.json();
  } catch {
    return showEmpty();
  }
  if (!Array.isArray(posts) || !posts.length) return showEmpty();

  posts.sort((a, b) => b.date.localeCompare(a.date));
  container.replaceChildren(
    ...posts.map((post) => {
      const article = document.createElement('article');
      article.className = 'blog-post';

      const date = document.createElement('p');
      date.className = 'blog-date';
      date.textContent = new Date(`${post.date}T12:00:00`).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
      const title = document.createElement('h2');
      title.textContent = post.title;
      article.append(date, title);

      if (post.image) {
        const image = document.createElement('img');
        image.className = 'blog-image';
        image.src = post.image;
        image.alt = '';
        image.loading = 'lazy';
        article.append(image);
      }
      // Eine Leerzeile im Text = neuer Absatz
      post.text.split(/\n\s*\n/).forEach((block) => {
        const paragraph = document.createElement('p');
        paragraph.textContent = block.trim();
        article.append(paragraph);
      });
      return article;
    })
  );
})();
