"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from "use-debounce";
import { Suspense } from "react";
import UserTable from "@/components/user-table";
import CustomPagination from "@/components/pagination";


function Page() {
  const { replace } = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const query = searchParams.get("query") || "";
  const page = parseInt(searchParams.get("page") || "1");

  const handleSearch = useDebouncedCallback((name) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");

    if (name) {
      params.set("query", name);
    } else {
      params.delete("query");
    }

    replace(`${pathname}?${params.toString()}`);
  }, 600);

  const [users, setUsers] = useState([]);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetch(`/api/filtered-users?name=${query}&page=${page}`)
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        setUsers(JSON.parse(data));
      })
      .catch((err) => {
        console.error(err);
      });

    fetch(`/api/total-pages?name=${query}`)
      .then((res) => res.json())
      .then((data) => {
        setTotalPages(Number(data.totalPages));
      })
      .catch((err) => {
        console.error(err);
      });
  }, [page, query]);

  return (
    <div className="container mx-auto max-w-3xl px-5 md:px-0">
      <h1 className="text-3xl font-bold mb-6 mt-6 text-center">
        🏆Leaderboard🏆
      </h1>
      <label htmlFor="search mb-8">Search user by name 🔍</label>
      <Input
        type="text"
        placeholder="Enter name"
        onChange={(e) => handleSearch(e.target.value)}
        className="w-full mb-8"
        defaultValue={searchParams.get("query")?.toString()}
        name="search"
      />

      <UserTable users={users} />
      <CustomPagination totalPages={totalPages} />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}
