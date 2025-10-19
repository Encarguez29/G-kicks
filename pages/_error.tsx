import React from 'react'
import type { NextPageContext } from 'next'

function ErrorPage({ statusCode }: { statusCode?: number }) {
  return (
    <div style={{ padding: 40, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>
        {statusCode ? `Error ${statusCode}` : 'An error occurred'}
      </h1>
      <p>Sorry, something went wrong. Please try again.</p>
    </div>
  )
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res?.statusCode ?? (err as any)?.statusCode ?? 500
  return { statusCode }
}

export default ErrorPage