import * as React from 'react'
import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from '@react-email/components'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="zh-Hant" dir="ltr">
    <Head />
    <Preview>你的驗證代碼</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>確認身分驗證</Heading>
        <Text style={text}>請使用下方代碼確認你的身分：</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>此代碼將在短時間內失效；若非本人操作，可以忽略這封信。</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#FCFBF8', fontFamily: '"Noto Sans TC", Arial, sans-serif' }
const container = { padding: '24px 28px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#111', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#444', lineHeight: '1.7', margin: '0 0 22px' }
const codeStyle = {
  fontFamily: 'Courier, monospace', fontSize: '24px', fontWeight: 'bold' as const,
  letterSpacing: '4px', color: '#111', margin: '0 0 30px',
}
const footer = { fontSize: '12px', color: '#888', margin: '30px 0 0' }
