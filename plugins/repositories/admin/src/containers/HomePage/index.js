import React, { useState, useEffect, memo } from "react";
import axios from "axios";
import { Header } from "@buffetjs/custom";
import { Table } from "@buffetjs/core";
import styled from "styled-components";

const Wrapper = styled.div`
  padding: 18px 30px;
  p {
    margin-top: 1rem;
  }
`;
const HomePage = () => {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    axios
      .get("https://api.github.com/users/rafaeldellaquila/repos")
      .then((res) => setRows(res.data))
      .catch((error) =>
        strapi.notification.error(
          `Github excedeu o limite de chamadas, ${error}`
        )
      );
  }, []);

  const headers = [
    {
      name: "Name",
      value: "name",
    },
    {
      name: "Description",
      value: "description",
    },
    {
      name: "Url",
      value: "html_url",
    },
  ];

  return (
    <Wrapper>
      <Header title={{ label: "My Repos" }} content="A list of my Repos" />
      <Table headers={headers} rows={rows} />
    </Wrapper>
  );
};

export default memo(HomePage);
