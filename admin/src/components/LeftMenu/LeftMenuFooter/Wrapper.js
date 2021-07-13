import styled, { css } from "styled-components";

const Wrapper = styled.div`
  ${({ theme }) => css`
    position: absolute;
    bottom: 0;
    width: 100%;
    background: ${theme.main.colors.won.blue};
    .poweredBy {
      line-height: 3rem;
      font-size: 1.1rem;
      font-weight: 400;
      letter-spacing: 0.05rem;
      text-align: center;
      color: ${theme.main.colors.strapi["gray-light"]};
    }
  `}
`;

const A = styled.a`
  ${({ theme }) => css`
    color: ${theme.main.colors.won.orange};
    &:hover {
      color: ${theme.main.colors.won.pink};
      text-decoration: underline;
    }
  `}
`;

export default Wrapper;
export { A };
