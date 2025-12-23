"use client"

import useSWR from "swr"
import { Users, FileText, CheckCircle, Clock, BookOpen, Key, Calculator, Layers, FolderTree } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AdminDashboard() {
  const { data: stats, isLoading: loadingStats } = useSWR("/api/admin/stats", fetcher)

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Removed AdminSidebar component */}
      {/* Removed SectionsManager, QuestionsManager, QuestionGroupManager, ExamsManager, TestCodesManager, AttemptsViewer, O2Evaluation, and RaschCalculator components */}

      <main className="flex-1 p-4 sm:p-6 overflow-auto">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Imtihon tizimi umumiy ko&apos;rinishi</p>
          </div>

          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {loadingStats ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Talabalar</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.totalStudents || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Urinishlar</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.totalAttempts || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tugallangan</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.completedAttempts || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Davom etmoqda</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.inProgressAttempts || 0}</div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Savollar</CardTitle>
                <CardDescription>Savollar bazasi haqida</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex justify-between">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-8" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Y1 (tanlov)</span>
                      <span className="font-medium">{stats?.questionsByType?.Y1 || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Y2 (guruhli)</span>
                      <span className="font-medium">{stats?.questionsByType?.Y2 || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">O1 (qisqa javob)</span>
                      <span className="font-medium">{stats?.questionsByType?.O1 || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">O2 (rasm bilan)</span>
                      <span className="font-medium">{stats?.questionsByType?.O2 || 0}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tezkor harakatlar</CardTitle>
                <CardDescription>Ko&apos;p ishlatiladigan funksiyalar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
                  <Link href="/admin/sections">
                    <Layers className="mr-2 h-4 w-4" />
                    Bo&apos;limlar boshqaruvi
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
                  <Link href="/admin/questions">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Savollar
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
                  <Link href="/admin/y2groups">
                    <FolderTree className="mr-2 h-4 w-4" />
                    Guruhlar (Y2)
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
                  <Link href="/admin/codes">
                    <Key className="mr-2 h-4 w-4" />
                    Test kodlari
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
                  <Link href="/admin/rasch">
                    <Calculator className="mr-2 h-4 w-4" />
                    Rasch hisoblash
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
