import React, { PureComponent } from 'react';
import Ink from 'react-ink';
import styled from 'styled-components';
import Link from 'next/link';
import Cast from './Cast';

const Wrapper = styled.div`
  height: 40px;
  border-bottom: 1px solid #f5f5f5;
  -webkit-app-region: drag;
  display: flex;
  flex-direction: row-reverse;
  padding:0 10px;
`;

const Icon = styled.i`
  font-size: 20px;
  padding: 8px 10px;
  vertical-align: middle;
  display: inline-block;
  color: #777;
  cursor: pointer;
  position: relative;
  &:hover{
    color: #555;
  }
`;

const Li = styled.li`
  cursor: pointer;
  position: relative;
  &:hover {
    color: purple;
  }
`;

export default class MenuBar extends PureComponent {
  render() {
    return (
      <Wrapper>
        <Cast />
        <Link href="/download" prefetch>
          <Icon className="mdi mdi-download"><Ink /></Icon>
        </Link>
        <Link href="/" prefetch>
          <Icon className="mdi mdi-home"><Ink /></Icon>
        </Link>
      </Wrapper>
    );
  }
}
