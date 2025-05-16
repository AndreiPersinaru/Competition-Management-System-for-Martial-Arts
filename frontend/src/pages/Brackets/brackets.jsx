import React, { useState, useEffect } from "react";
import { Bracket, Seed, SeedItem, SeedTeam } from "react-brackets";
import { Select, MenuItem, FormControl, InputLabel, Box, Typography, Grid } from "@mui/material";
import axios from "axios";

const CustomSeed = ({ seed, breakpoint }) => {
    return (
        <Seed mobileBreakpoint={breakpoint}>
            <SeedItem>
                <Box>
                    <SeedTeam
                        style={{
                            color: "black",
                            backgroundColor: "#f8f9fa",
                            width: "300px",
                            height: "50px",
                            fontSize: "18px",
                            fontWeight: "bold",
                            border: "1px solid black",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "0 15px",
                        }}
                    >
                        {seed.teams[0]?.name || "-------"}
                        <span style={{ fontSize: "24px" }}>{seed.teams[0]?.score ?? ""}</span>
                    </SeedTeam>
                    <SeedTeam
                        style={{
                            color: "white",
                            backgroundColor: "#1a53ff",
                            width: "300px",
                            height: "50px",
                            fontSize: "18px",
                            fontWeight: "bold",
                            border: "1px solid black",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "0 15px",
                        }}
                    >
                        {seed.teams[1]?.name || "-------"}
                        <span style={{ fontSize: "24px" }}>{seed.teams[1]?.score ?? ""}</span>
                    </SeedTeam>
                </Box>
            </SeedItem>
        </Seed>
    );
};

const BracketPage = () => {
    const apiClient = axios.create({ timeout: 5000, headers: { "Content-Type": "application/json" } });

    const [bracketData, setBracketData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [participants, setParticipants] = useState(0);
    const [categories, setCategories] = useState([]);
    const [sex, setSex] = useState("");
    const [age, setAge] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [probes, setProbes] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [meciuriRes, sportiviRes, categoriiRes] = await Promise.all([
                    apiClient.get("http://127.0.1:8000/api/meciuri/"),
                    apiClient.get("http://127.0.1:8000/api/sportivi/"),
                    apiClient.get("http://127.0.1:8000/api/categorii/"),
                ]);

                const meciuri = meciuriRes.data;
                const sportiviMap = {};
                sportiviRes.data.forEach((s) => {
                    sportiviMap[s.id] = `${s.nume} ${s.prenume} (${s.club_nume})`;
                });

                const categoriiMap = {};
                categoriiRes.data.forEach((cat) => {
                    categoriiMap[cat.id] = {
                        probaId: cat.proba,
                        sex: cat.sex,
                        varsta_min: cat.varsta_min,
                        varsta_max: cat.varsta_max,
                    };
                });

                const categorySet = new Set();
                const probaIds = new Set();

                meciuri.forEach((m) => {
                    const c = categoriiMap[m.categorie];
                    if (c) {
                        categorySet.add(`${m.categorie}-${c.sex}-${c.probaId}-${c.varsta_min}-${c.varsta_max}`);
                        probaIds.add(c.probaId);
                    }
                });

                const probeRes = await Promise.all(Array.from(probaIds).map((id) => apiClient.get(`http://127.0.1:8000/api/probe/${id}/`)));
                const probaMap = {};
                probeRes.forEach((res) => {
                    probaMap[res.data.id] = res.data.nume;
                });

                const uniqueCategories = Array.from(categorySet).map((item) => {
                    const [categorie, sex, probaId, varsta_min, varsta_max] = item.split("-");
                    return {
                        categorie,
                        sex,
                        probaId,
                        varsta_min,
                        varsta_max,
                        proba: probaMap[parseInt(probaId)],
                    };
                });

                setBracketData(
                    meciuri.map((m) => ({
                        ...m,
                        sex: categoriiMap[m.categorie]?.sex,
                        varsta: `${categoriiMap[m.categorie]?.varsta_min}-${categoriiMap[m.categorie]?.varsta_max}`,
                        sportiv1_nume: sportiviMap[m.sportiv1],
                        sportiv2_nume: sportiviMap[m.sportiv2],
                    }))
                );

                setCategories(uniqueCategories);
                setProbes(Object.entries(probaMap).map(([id, nume]) => ({ id: parseInt(id), nume })));
            } catch (error) {
                console.error("Eroare la fetch:", error);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        if (selectedCategoryId && sex && age) {
            const filtered = bracketData.filter((m) => m.sex == sex && m.varsta == age && categories.find((c) => c.probaId == selectedCategoryId && c.categorie == m.categorie));
            setFilteredData(filtered);

            const ids = new Set();
            filtered.forEach((m) => {
                if (m.sportiv1) ids.add(m.sportiv1);
                if (m.sportiv2) ids.add(m.sportiv2);
            });
            setParticipants(ids.size);
        } else {
            setFilteredData([]);
            setParticipants(0);
        }
    }, [selectedCategoryId, sex, age, bracketData, categories]);

    const buildBracketStructure = (participantsCount, matches) => {
        const matchMap = Object.fromEntries(matches.map((m) => [m.id, m]));
        const matchIds = matches.map((m) => m.id).sort((a, b) => a - b);
        let index = 0;

        const getMatch = () => {
            const match = matchMap[matchIds[index]];
            index++;
            return (
                match || {
                    id: matchIds[index - 1] || `new-${index}`,
                    teams: [
                        { name: "-------", score: "" },
                        { name: "-------", score: "" },
                    ],
                }
            );
        };

        if (participantsCount === 2) {
            return [
                { title: "Meci 1", seeds: [getMatch()] },
                { title: "Meci 2", seeds: [getMatch()] },
                { title: "Meci 3", seeds: [getMatch()] },
            ];
        }

        if (participantsCount === 3) {
            return [
                { title: "Meci 1", seeds: [getMatch()] },
                { title: "Meci 2", seeds: [getMatch()] },
                { title: "Meci 3", seeds: [getMatch()] },
            ];
        }

        if (participantsCount === 4) {
            return {
                main: [
                    { title: "Semifinale", seeds: [getMatch(), getMatch()] },
                    { title: "Finala", seeds: [getMatch()] },
                ],
                loser: [{ title: "Locul 3", seeds: [getMatch()] }],
            };
        }

        if (participantsCount > 4 && participantsCount <= 8) {
            return {
                main: [
                    {
                        title: "Sferturi",
                        seeds: [getMatch(), getMatch(), getMatch(), getMatch()],
                    },
                    {
                        title: "Semifinale",
                        seeds: [getMatch(), getMatch()],
                    },
                    {
                        title: "Finala",
                        seeds: [getMatch()],
                    },
                ],
                loser: [
                    {
                        title: "Runda 1 Pierzatori",
                        seeds: [getMatch(), getMatch()],
                    },
                    {
                        title: "Runda 2 Pierzatori",
                        seeds: [getMatch(), getMatch()],
                    },
                    {
                        title: "Locul 3",
                        seeds: [getMatch()],
                    },
                ],
            };
        }

        return null;
    };

    const renderBracket = () => {
        const matchData = filteredData.map((m) => ({
            id: m.id,
            teams: [
                { name: m.sportiv1_nume || "-------", score: m.scor1 },
                { name: m.sportiv2_nume || "-------", score: m.scor2 },
            ],
        }));

        const structure = buildBracketStructure(participants, matchData);

        if (participants === 2 || participants === 3) {
            return <Bracket rounds={structure} renderSeedComponent={CustomSeed} />;
        }

        if (participants > 3 && participants <= 8) {
            return (
                <Box display="flex" flexDirection="column" gap={5}>
                    <Box>
                        <Typography variant="h6">Main Bracket</Typography>
                        <Bracket rounds={structure.main} renderSeedComponent={CustomSeed} />
                    </Box>
                    <Box>
                        <Typography variant="h6">Loser Bracket</Typography>
                        <Bracket rounds={structure.loser} renderSeedComponent={CustomSeed} />
                    </Box>
                </Box>
            );
        }

        return null;
    };

    return (
        <Box p={3}>
            <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                        <InputLabel>Probă</InputLabel>
                        <Select value={selectedCategoryId || ""} label="Categorie" onChange={(e) => setSelectedCategoryId(e.target.value)}>
                            {probes.map((proba) => (
                                <MenuItem key={proba.id} value={proba.id}>
                                    {proba.nume}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                        <InputLabel>Gen</InputLabel>
                        <Select value={sex} label="Gen" onChange={(e) => setSex(e.target.value)}>
                            <MenuItem value="M">Masculin</MenuItem>
                            <MenuItem value="F">Feminin</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                        <InputLabel>Vârstă</InputLabel>
                        <Select value={age} label="Vârstă" onChange={(e) => setAge(e.target.value)}>
                            {Array.from(new Set(categories.filter((c) => c.sex === sex && c.probaId == selectedCategoryId).map((c) => `${c.varsta_min}-${c.varsta_max}`))).map((v) => (
                                <MenuItem key={v} value={v}>
                                    {v}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>

            <Box mt={4}>
                {filteredData.length > 0 ? (
                    renderBracket()
                ) : (
                    <Typography variant="h6" align="center" mt={5}>
                        Selectează sexul, vârsta și categoria pentru a vizualiza bracketul.
                    </Typography>
                )}
            </Box>
        </Box>
    );
};

export default BracketPage;
