import type { AppProps } from "next/app";
import Head from "next/head";
import "@/styles/globals.css";
import Layout from "@/components/Layout";
import { APP_NAME, APP_TAGLINE } from "@/lib/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>{`${APP_NAME} — ${APP_TAGLINE}`}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </>
  );
}
