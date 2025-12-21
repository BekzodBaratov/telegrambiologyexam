"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import useSWR from "swr"
import { Users, FileText, CheckCircle, Clock, BookOpen, Key, Calculator, Layers, FolderTree } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { SectionsManager } from "@/components/admin/sections-manager"
import { QuestionsManager } from "@/components/admin/questions-manager"
import { QuestionGroupManager } from "@/components/admin/question-group-manager"
import { ExamsManager } from "@/components/admin/exams-manager"
import { TestCodesManager } from "@/components/admin/test-codes-manager"
import { AttemptsViewer } from "@/components/admin/attempts-viewer"
import { O2Evaluation } from "@/components/admin/o2-evaluation"
import { RaschCalculator } from "@/components/admin/rasch-calculator"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AdminDashboard() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState("dashboard")
  const { data: stats } = useSWR("/api/admin/stats", fetcher)

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab")
    if (tabFromUrl) {
      // Map common names to tab keys
      const tabMap: Record<string, string> = {
        "test-codes": "codes",
        codes: "codes",
        questions: "questions",
        sections: "sections",
        exams: "exams",
        y2groups: "y2groups",
        attempts: "attempts",
        evaluation: "evaluation",
        rasch: "rasch",
      }
      const mappedTab = tabMap[tabFromUrl] || tabFromUrl
      setActiveTab(mappedTab)
    }
  }, [searchParams])

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 p-6 overflow-auto">
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground">Imtihon tizimi umumiy ko&apos;rinishi</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Jami o&apos;quvchilar</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalStudents || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Jami urinishlar</CardTitle>
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
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Savollar</CardTitle>
                  <CardDescription>Savollar bazasi haqida</CardDescription>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tezkor harakatlar</CardTitle>
                  <CardDescription>Ko&apos;p ishlatiladigan funksiyalar</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent"
                    onClick={() => setActiveTab("sections")}
                  >
                    <Layers className="mr-2 h-4 w-4" />
                    Bo&apos;limlar boshqaruvi
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent"
                    onClick={() => setActiveTab("questions")}
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    Savollar
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent"
                    onClick={() => setActiveTab("y2groups")}
                  >
                    <FolderTree className="mr-2 h-4 w-4" />
                    Guruhlar (Y2)
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent"
                    onClick={() => setActiveTab("codes")}
                  >
                    <Key className="mr-2 h-4 w-4" />
                    Test kodlari
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent"
                    onClick={() => setActiveTab("rasch")}
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    Rasch hisoblash
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "sections" && <SectionsManager />}
        {activeTab === "questions" && <QuestionsManager />}
        {activeTab === "y2groups" && <QuestionGroupManager />}
        {activeTab === "exams" && <ExamsManager />}
        {activeTab === "codes" && <TestCodesManager />}
        {activeTab === "attempts" && <AttemptsViewer />}
        {activeTab === "evaluation" && <O2Evaluation />}
        {activeTab === "rasch" && <RaschCalculator />}
      </main>
    </div>
  )
}
