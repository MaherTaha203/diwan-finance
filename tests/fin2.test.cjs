/* P2-B unit tests for the new-model engine (FIN2). Pure node, no browser.
   Run: node tests/fin2.test.cjs
   Loads the real public/js/model2.js + public/js/fin2.js and exercises the
   new-model math on synthetic classified rows, plus neutrality on unclassified rows. */
const fs=require('fs'), path=require('path');
const PUB=path.join(__dirname,'..','public','js');
global.window={};
global.DB={ receipts:[], payments:[], inkind_donations:[] };
new Function('window', fs.readFileSync(path.join(PUB,'model2.js'),'utf8'))(global.window);
const FIN2=(function(){ const s={window:global.window, DB:global.DB, module:{exports:{}}};
  new Function('window','DB','module', fs.readFileSync(path.join(PUB,'fin2.js'),'utf8'))(s.window,s.DB,s.module);
  return s.window.FIN2; })();

let ok=true; const eq=(a,b,m)=>{const p=JSON.stringify(a)===JSON.stringify(b);ok=p&&ok;
  console.log((p?'PASS':'FAIL')+' '+m+'  got='+JSON.stringify(a)+(p?'':' want='+JSON.stringify(b)));};

/* 1) neutral on unclassified (current production) rows */
global.DB.receipts=[{id:'u1',amount_ils:500,fund_type:'food',is_deleted:false},{id:'u2',amount_ils:300,fund_type:'diwan',is_deleted:false}];
global.DB.payments=[{id:'u3',amount_ils:100,fund_type:'food',is_deleted:false}];
eq(FIN2.isClassified(),false,'unclassified -> isClassified=false');
eq([FIN2.foodTreasury(),FIN2.diwanTreasury(),FIN2.historicalDeficitTreasury()],[0,0,0],'unclassified -> all treasuries 0');
eq(FIN2.cashDonationRegister().length,0,'unclassified -> empty cash register');

/* 2) classified rows exercise the full model */
global.DB.receipts=[
  {id:'r1',no:'C1',amount_ils:100,is_deleted:false,movement_type:'historical_debt_collection',destination_treasury:'historical_deficit'},
  {id:'r2',no:'S1',amount_ils:40, is_deleted:false,movement_type:'historical_deficit_settlement',destination_treasury:'historical_deficit'},
  {id:'r3',no:'D1',amount_ils:200,is_deleted:false,movement_type:'donation_cash',destination_treasury:'food',payer_name:'donor'},
  {id:'r4',no:'D2',amount_ils:70, is_deleted:false,movement_type:'donation_cash',destination_treasury:'diwan'},
  {id:'r5',no:'K1',amount_ils:500,is_deleted:false,movement_type:'donation_inkind',destination_treasury:null},
  {id:'r7',no:'T1',amount_ils:150,is_deleted:false,movement_type:'overflow_transfer',destination_treasury:'food',source_treasury:'historical_deficit'}
];
global.DB.payments=[{id:'p6',no:'E1',amount_ils:30,is_deleted:false,movement_type:'food_expense',destination_treasury:'food'}];
eq(FIN2.isClassified(),true,'classified -> isClassified=true');
eq(FIN2.foodTreasury(),320,'food = 200 -30 +150 = 320');
eq(FIN2.diwanTreasury(),70,'diwan = 70');
eq(FIN2.historicalDeficitTreasury(),-90,'deficit = +100 -40 -150 = -90');
eq(FIN2.deficitSettlementTotal(),40,'settlement total = 40 (cash OUT)');
eq(FIN2.cashDonationRegister().length,2,'cash register = 2 donations');
/* ق3: a classified donation_inkind voucher appears in the In-Kind register with
   its documentation value, while contributing ZERO cash to any treasury. */
eq(FIN2.inkindRegister().length,1,'classified donation_inkind listed in the in-kind register');
eq(FIN2.inkindRegister()[0].estimated_value,500,'in-kind register carries the documentation value');
eq(FIN2.foodTreasury()+FIN2.diwanTreasury()+FIN2.historicalDeficitTreasury(),300,'total classified cash = 300 (in-kind excluded)');

/* 3) overflow rule + 4) allocation order */
eq(FIN2.overflowDue(500,800),300,'overflow 800 vs rem 500 -> 300');
eq(FIN2.overflowDue(0,100),100,'overflow rem 0 -> 100');
eq(FIN2.overflowDue(500,300),0,'overflow 300 < rem 500 -> 0');
eq(FIN2.allocationOrder(),['subscription_2025','subscription_2026','historical_debt','future_credit'],'allocation order');

/* 5) edge cases (added per Fable 5 P2-B review) */
// (a) a soft-deleted CLASSIFIED row must be excluded from treasuries
global.DB.receipts=[{id:'d1',amount_ils:999,is_deleted:true,movement_type:'historical_debt_collection',destination_treasury:'historical_deficit'}];
global.DB.payments=[];
eq(FIN2.historicalDeficitTreasury(),0,'soft-deleted classified row excluded from treasury');
eq(FIN2.isClassified(),false,'soft-deleted only -> no live classified rows');
// (b) donation_cash directed to historical_deficit (ratified directed-deficit donation)
global.DB.receipts=[{id:'dd1',no:'DD',amount_ils:250,is_deleted:false,movement_type:'donation_cash',destination_treasury:'historical_deficit',payer_name:'x'}];
eq(FIN2.historicalDeficitTreasury(),250,'donation_cash -> historical_deficit increases the deficit pot');
eq(FIN2.cashDonationRegister().length,1,'directed-deficit cash donation still recorded in the register');
// (c) refund is a cash OUTflow from its (resolved) origin treasury
global.DB.receipts=[]; global.DB.payments=[{id:'rf1',amount_ils:60,is_deleted:false,movement_type:'refund',destination_treasury:'food'}];
eq(FIN2.foodTreasury(),-60,'refund -> cash OUT of origin treasury (food -60)');
// (d) reclassification is non-cash: no treasury effect even with a destination present
global.DB.receipts=[{id:'rc1',amount_ils:500,is_deleted:false,movement_type:'reclassification',destination_treasury:'food'}]; global.DB.payments=[];
eq(FIN2.foodTreasury(),0,'reclassification is non-cash -> no treasury effect');

console.log(ok?'\nALL PASS':'\nFAILURES'); process.exit(ok?0:1);
