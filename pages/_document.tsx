import { Html, Head, Main, NextScript } from "next/document";

// Apply the saved theme before paint to avoid a flash of the wrong theme.
const themeScript = `try{if(localStorage.getItem('theme')==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}`;

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
